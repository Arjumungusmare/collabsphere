
const Note = require("../models/Note");
const fs = require("fs/promises");
const path = require("path");

const uploadDir = path.resolve(__dirname, "../uploads");

const uploadAttachment = async (req, res) => {
  let savedFilePath;

  try {
    if (!req.file) {
      return res.status(400).json({
        message: "Please select a file.",
      });
    }

    savedFilePath = req.file.path;

    const note = await Note.findOne({
      _id: req.params.noteId,
      user: req.user.userId,
    });

    if (!note) {
      await fs.unlink(savedFilePath).catch(() => {});
      return res.status(404).json({
        message: "Note not found.",
      });
    }

    const attachment = {
      originalName: path.basename(req.file.originalname),
      storedName: req.file.filename,
      mimeType: req.file.mimetype,
      size: req.file.size,
      path: req.file.filename,
    };

    note.attachments.push(attachment);
    await note.save();

    const savedAttachment =
      note.attachments[note.attachments.length - 1];

    return res.status(201).json({
      message: "File uploaded successfully.",
      attachment: savedAttachment,
    });
  } catch (error) {
    if (savedFilePath) {
      await fs.unlink(savedFilePath).catch(() => {});
    }

    console.error("Upload error:", error);

    return res.status(500).json({
      message: "Failed to upload file.",
    });
  }
};

const getAttachment = async (req, res) => {
  try {
    const { noteId, attachmentId } = req.params;

    const note = await Note.findOne({
      _id: noteId,
      user: req.user.userId,
    });

    if (!note) {
      return res.status(404).json({
        message: "Note not found.",
      });
    }

    const attachment = note.attachments.id(attachmentId);

    if (!attachment) {
      return res.status(404).json({
        message: "Attachment not found.",
      });
    }

    const filePath = path.resolve(
      uploadDir,
      attachment.storedName
    );

    if (path.dirname(filePath) !== uploadDir) {
      return res.status(400).json({
        message: "Invalid file path.",
      });
    }

    const download = req.query.download === "true";
    const extension = path.extname(attachment.storedName).toLowerCase();

    const previewTypes = {
      ".txt": "text/plain",
      ".md": "text/plain",
      ".js": "text/plain",
      ".jsx": "text/plain",
      ".ts": "text/plain",
      ".tsx": "text/plain",
      ".py": "text/plain",
      ".json": "text/plain",
      ".css": "text/plain",
      ".html": "text/plain",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".gif": "image/gif",
      ".webp": "image/webp",
      ".pdf": "application/pdf",
    };

    if (!download && !previewTypes[extension]) {
      return res.status(415).json({
        message: "Preview is not supported for this file.",
      });
    }

    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'none'; sandbox"
    );

    res.setHeader(
      "Content-Type",
      download
        ? "application/octet-stream"
        : previewTypes[extension]
    );

    res.setHeader(
      "Content-Disposition",
      `${download ? "attachment" : "inline"}; filename="attachment"`
    );

    return res.sendFile(filePath, (error) => {
      if (error && !res.headersSent) {
        res.status(404).json({
          message: "File not found on server.",
        });
      }
    });
  } catch (error) {
    console.error("Attachment access error:", error);

    if (!res.headersSent) {
      return res.status(400).json({
        message: "Unable to access attachment.",
      });
    }
  }
};

module.exports = {
  uploadAttachment,
  getAttachment,
};
