
const mongoose = require("mongoose");
const Project = require("../models/Project");
const User = require("../models/User");
const Note = require("../models/Note");

// Create a new project
const createProject = async (req, res) => {
  try {
    const { name, description = "" } = req.body;

    // Validate project name
    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        message: "Project name is required.",
      });
    }

    if (name.trim().length > 100) {
      return res.status(400).json({
        message: "Project name cannot exceed 100 characters.",
      });
    }

    // Validate description
    if (
      typeof description !== "string" ||
      description.length > 1000
    ) {
      return res.status(400).json({
        message:
          "Description must be a string and cannot exceed 1000 characters.",
      });
    }

    const userId = req.user.userId;

    // Create project; creator becomes owner and member
    const project = await Project.create({
      name: name.trim(),
      description: description.trim(),
      owner: userId,
      members: [userId],
    });

    const populatedProject = await Project.findById(project._id)
      .populate("owner", "email")
      .populate("members", "email");

    return res.status(201).json({
      message: "Project created successfully.",
      project: populatedProject,
    });
  } catch (error) {
    console.error("Create project error:", error);

    return res.status(500).json({
      message: "Failed to create project.",
    });
  }
};

// Get projects where the logged-in user is owner or member
const getProjects = async (req, res) => {
  try {
    const userId = req.user.userId;

    const projects = await Project.find({
      $or: [
        { owner: userId },
        { members: userId },
      ],
    })
      .populate("owner", "email")
      .populate("members", "email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      projects,
    });
  } catch (error) {
    console.error("Get projects error:", error);

    return res.status(500).json({
      message: "Failed to fetch projects.",
    });
  }
};

// Add an existing registered user by email
const addProjectMember = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { email: rawEmail } = req.body;

    if (!mongoose.isValidObjectId(projectId)) {
      return res.status(400).json({
        message: "Invalid project ID.",
      });
    }

    if (typeof rawEmail !== "string" || !rawEmail.trim()) {
      return res.status(400).json({
        message: "Registered user's email is required.",
      });
    }

    const email = rawEmail.trim().toLowerCase();

    // Find project
    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({
        message: "Project not found.",
      });
    }

    // Only the owner can add members
    if (project.owner.toString() !== req.user.userId) {
      return res.status(403).json({
        message: "Only the project owner can add members.",
      });
    }

    // Find an already registered user
    const user = await User.findOne({ email }).select("_id email");

    if (!user) {
      return res.status(404).json({
        message: "No registered user found with this email.",
      });
    }

    const userId = user._id.toString();

    // Prevent duplicate members
    const alreadyMember = project.members.some(
      (memberId) => memberId.toString() === userId
    );

    if (alreadyMember) {
      return res.status(409).json({
        message: "This user is already a project member.",
      });
    }

    project.members.push(user._id);
    await project.save();

    const updatedProject = await Project.findById(project._id)
      .populate("owner", "email")
      .populate("members", "email");

    return res.status(200).json({
      message: "Project member added successfully.",
      project: updatedProject,
    });
  } catch (error) {
    console.error("Add project member error:", error);

    return res.status(500).json({
      message: "Failed to add project member.",
    });
  }
};

// Remove a member from a project
const removeProjectMember = async (req, res) => {
  try {
    const { projectId, memberId } = req.params;

    if (
      !mongoose.isValidObjectId(projectId) ||
      !mongoose.isValidObjectId(memberId)
    ) {
      return res.status(400).json({
        message: "Invalid project or member ID.",
      });
    }

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({
        message: "Project not found.",
      });
    }

    // Only the owner can remove members
    if (project.owner.toString() !== req.user.userId) {
      return res.status(403).json({
        message: "Only the project owner can remove members.",
      });
    }

    // The owner cannot be removed
    if (project.owner.toString() === memberId) {
      return res.status(400).json({
        message: "The project owner cannot be removed.",
      });
    }

    const isMember = project.members.some(
      (id) => id.toString() === memberId
    );

    if (!isMember) {
      return res.status(404).json({
        message: "This user is not a member of the project.",
      });
    }

    // Remove the selected member
    project.members = project.members.filter(
      (id) => id.toString() !== memberId
    );

    await project.save();

    const updatedProject = await Project.findById(project._id)
      .populate("owner", "email")
      .populate("members", "email");

    return res.status(200).json({
      message: "Project member removed successfully.",
      project: updatedProject,
    });
  } catch (error) {
    console.error("Remove project member error:", error);

    return res.status(500).json({
      message: "Failed to remove project member.",
    });
  }
};

// Delete a project and its notes
const deleteProject = async (req, res) => {
  try {
    const { projectId } = req.params;

    if (!mongoose.isValidObjectId(projectId)) {
      return res.status(400).json({
        message: "Invalid project ID.",
      });
    }

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({
        message: "Project not found.",
      });
    }

    // Only the owner can delete the project
    if (project.owner.toString() !== req.user.userId) {
      return res.status(403).json({
        message: "Only the project owner can delete this project.",
      });
    }

    // Delete notes associated with this project
    await Note.deleteMany({ project: project._id });

    // Delete the project
    await project.deleteOne();

    return res.status(200).json({
      message: "Project and its notes deleted successfully.",
    });
  } catch (error) {
    console.error("Delete project error:", error);

    return res.status(500).json({
      message: "Failed to delete project.",
    });
  }
};

module.exports = {
  createProject,
  getProjects,
  addProjectMember,
  removeProjectMember,
  deleteProject,
};
