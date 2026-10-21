
const Note = require("../models/Note");
const Project = require("../models/Project");

// Check whether the logged-in user can access a project
async function getAccessibleProject(projectId, userId) {
  return Project.findOne({
    _id: projectId,
    $or: [
      { owner: userId },
      { members: userId },
    ],
  });
}

// Create a note inside a project
exports.createNote = async (req, res) => {
  try {
    const { title, content, projectId } = req.body;
    const userId = req.user.id || req.user.userId;

    if (!title || !projectId) {
      return res.status(400).json({
        message: "Title and project are required",
      });
    }

    const project = await getAccessibleProject(
      projectId,
      userId
    );

    if (!project) {
      return res.status(404).json({
        message: "Project not found or access denied",
      });
    }

    const note = await Note.create({
      title,
      content: content || "",
      user: userId,
      project: project._id,
    });

    res.status(201).json({
      message: "Note created successfully",
      note,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to create note",
      error: error.message,
    });
  }
};

// Get all notes belonging to a project
exports.getProjectNotes = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const { projectId } = req.params;

    const project = await getAccessibleProject(
      projectId,
      userId
    );

    if (!project) {
      return res.status(404).json({
        message: "Project not found or access denied",
      });
    }

    const notes = await Note.find({
      project: projectId,
    })
      .populate("user", "email")
      .populate("project", "name title")
      .sort({ updatedAt: -1 });

    res.status(200).json({ notes });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch project notes",
      error: error.message,
    });
  }
};

// Get a single note
exports.getNoteById = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;

    const note = await Note.findById(req.params.id)
      .populate("project", "name title");

    if (!note) {
      return res.status(404).json({
        message: "Note not found",
      });
    }

    const project = await getAccessibleProject(
      note.project?._id,
      userId
    );

    if (!project) {
      return res.status(403).json({
        message: "Access denied",
      });
    }

    res.json({ note });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch note",
      error: error.message,
    });
  }
};

// Update a note without changing its project
exports.updateNote = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;

    const note = await Note.findById(req.params.id);

    if (!note) {
      return res.status(404).json({
        message: "Note not found",
      });
    }

    const project = await getAccessibleProject(
      note.project,
      userId
    );

    if (!project) {
      return res.status(403).json({
        message: "Access denied",
      });
    }

    if (req.body.projectId &&
        String(req.body.projectId) !== String(note.project)) {
      return res.status(400).json({
        message: "Move notes using a separate project operation",
      });
    }

    if (req.body.title !== undefined) {
      note.title = req.body.title;
    }

    if (req.body.content !== undefined) {
      note.content = req.body.content;
    }

    await note.save();

    res.json({
      message: "Note updated successfully",
      note,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to update note",
      error: error.message,
    });
  }
};

// Delete a note
exports.deleteNote = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;

    const note = await Note.findById(req.params.id);

    if (!note) {
      return res.status(404).json({
        message: "Note not found",
      });
    }

    const project = await getAccessibleProject(
      note.project,
      userId
    );

    if (!project) {
      return res.status(403).json({
        message: "Access denied",
      });
    }

    await note.deleteOne();

    res.json({
      message: "Note deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete note",
      error: error.message,
    });
  }
};
