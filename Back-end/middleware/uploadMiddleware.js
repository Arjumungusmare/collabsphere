
const multer = require("multer");
const path = require("path");
const crypto = require("crypto");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../uploads"));
  },

  filename: (req, file, cb) => {
    const uniqueName = crypto.randomUUID();
    const extension = path.extname(file.originalname).toLowerCase();

    cb(null, `${uniqueName}${extension}`);
  },
});

const allowedExtensions = new Set([
  ".txt",
  ".md",
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".py",
  ".json",
  ".css",
  ".html",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".pdf",
]);

const fileFilter = (req, file, cb) => {
  const extension = path
    .extname(file.originalname)
    .toLowerCase();

  if (!allowedExtensions.has(extension)) {
    return cb(
      new Error("This file type is not allowed.")
    );
  }

  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
});

module.exports = upload;
