
const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");

const {
  createProject,
  getProjects,
  addProjectMember,
  removeProjectMember,
  deleteProject,
} = require("../controllers/projectController");

// All project routes require authentication
router.use(authMiddleware);

// Create a project
router.post("/", createProject);

// Get projects for the logged-in user
router.get("/", getProjects);

// Add a project member
router.post("/:projectId/members", addProjectMember);

// Remove a project member
router.delete("/:projectId/members/:memberId", removeProjectMember);

// Delete a project and its associated notes
router.delete("/:projectId", deleteProject);

module.exports = router;
  