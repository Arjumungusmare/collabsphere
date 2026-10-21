
const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

const {
  uploadAttachment,
  getAttachment,
} = require("../controllers/attachmentController");

router.post("/:noteId", authMiddleware, (req, res, next) => {
  upload.single("file")(req, res, (error) => {
    if (error) {
      const message =
        error.code === "LIMIT_FILE_SIZE"
          ? "File size must be 5 MB or less."
          : error.message || "Upload failed.";

      return res.status(400).json({ message });
    }

    next();
  });
}, uploadAttachment);

router.get(
  "/:noteId/:attachmentId",
  authMiddleware,
  getAttachment
);

module.exports = router;
