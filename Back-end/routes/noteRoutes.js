
const express = require("express");
const router = express.Router();

const {
  createNote,
  getProjectNotes,
  getNoteById,
  updateNote,
  deleteNote,
} = require("../controllers/noteController");

const authMiddleware = require("../middleware/authMiddleware");

router.use(authMiddleware);

// Specific route must come before /:id
router.get("/project/:projectId", getProjectNotes);

router.post("/", createNote);
router.get("/:id", getNoteById);
router.put("/:id", updateNote);
router.delete("/:id", deleteNote);

module.exports = router;
