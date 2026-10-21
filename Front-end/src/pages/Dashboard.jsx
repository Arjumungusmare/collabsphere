
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import Navbar from "../components/Navbar";
import NoteCard from "../components/NoteCard";
import AIChat from "../components/AIchat";

import "../style/Dashboard.css";

const API_URL = "http://localhost:5000/api/notes";
const PROJECT_API_URL = "http://localhost:5000/api/projects";

// Get the logged-in user from localStorage or JWT.
function getStoredUser() {
  const storedUser = localStorage.getItem("user");

  if (storedUser) {
    try {
      const parsed = JSON.parse(storedUser);
      return parsed.user || parsed;
    } catch {
      return { email: storedUser };
    }
  }

  const token = localStorage.getItem("token");

  if (!token) return null;

  try {
    const payloadPart = token.split(".")[1];

    if (!payloadPart) return null;

    const base64 = payloadPart
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    const payload = JSON.parse(
      decodeURIComponent(
        atob(base64)
          .split("")
          .map(
            (character) =>
              "%" +
              character.charCodeAt(0)
                .toString(16)
                .padStart(2, "0")
          )
          .join("")
      )
    );

    return payload.user || payload;
  } catch (error) {
    console.error("Unable to read stored user:", error);
    return null;
  }
}

// Read API responses safely.
async function readResponse(response) {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.message || `Request failed (${response.status})`
    );
  }

  return data;
}

// Support either { projects: [...] } or [...] API responses.
function getProjectList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.projects)) return data.projects;

  throw new Error("Invalid projects response from server.");
}

function Dashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const selectedProjectId = searchParams.get("projectId");

  const [notes, setNotes] = useState([]);
  const [projects, setProjects] = useState([]);

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [projectsLoading, setProjectsLoading] = useState(true);

  const [error, setError] = useState("");
  const [projectError, setProjectError] = useState("");

  const [showProjectForm, setShowProjectForm] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [creatingProject, setCreatingProject] = useState(false);
  const [projectSuccess, setProjectSuccess] = useState("");

  const [activeManageProjectId, setActiveManageProjectId] =
    useState(null);
  const [memberEmail, setMemberEmail] = useState("");
  const [addingMember, setAddingMember] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState(null);
  const [memberError, setMemberError] = useState("");
  const [memberSuccess, setMemberSuccess] = useState("");

  const [deletingProjectId, setDeletingProjectId] = useState(null);

  const token = localStorage.getItem("token");
  const currentUser = getStoredUser();

  const currentUserEmail = (
    currentUser?.email ||
    currentUser?.user?.email ||
    ""
  ).toLowerCase();

  const currentUserId =
    currentUser?._id ||
    currentUser?.id ||
    currentUser?.userId ||
    currentUser?.sub ||
    currentUser?.user?._id ||
    currentUser?.user?.id ||
    currentUser?.user?.userId ||
    currentUser?.user?.sub;

  const selectedProject = projects.find(
    (project) =>
      String(project._id) === String(selectedProjectId)
  );

  function handleUnauthorized() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login", { replace: true });
  }

  // Load notes and projects.
  useEffect(() => {
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    const controller = new AbortController();

    async function fetchNotes() {
      try {
        setLoading(true);
        setError("");

        const notesUrl = selectedProjectId
          ? `${API_URL}/project/${selectedProjectId}`
          : API_URL;

        const response = await fetch(notesUrl, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
        });

        if (response.status === 401) {
          handleUnauthorized();
          return;
        }

        const data = await readResponse(response);

        const result = Array.isArray(data)
          ? data
          : data.notes;

        if (!Array.isArray(result)) {
          throw new Error("Invalid notes response from server.");
        }

        setNotes(result);
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("Fetch notes error:", err);
          setError(err.message || "Unable to load notes.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    async function fetchProjects() {
      try {
        setProjectsLoading(true);
        setProjectError("");

        const response = await fetch(PROJECT_API_URL, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
        });

        if (response.status === 401) {
          handleUnauthorized();
          return;
        }

        const data = await readResponse(response);
        setProjects(getProjectList(data));
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("Fetch projects error:", err);
          setProjectError(
            err.message || "Unable to load projects."
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setProjectsLoading(false);
        }
      }
    }

    fetchNotes();
    fetchProjects();

    return () => controller.abort();
  }, [token, navigate, selectedProjectId]);

  // Refresh projects without reloading the entire page.
  async function refreshProjects() {
    const response = await fetch(PROJECT_API_URL, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.status === 401) {
      handleUnauthorized();
      return;
    }

    const data = await readResponse(response);
    const projectList = getProjectList(data);

    setProjects(projectList);
    return projectList;
  }

  // Create a project.
  async function handleCreateProject(event) {
    event.preventDefault();

    if (!projectName.trim()) {
      setProjectError("Please enter a project name.");
      return;
    }

    setCreatingProject(true);
    setProjectError("");
    setProjectSuccess("");

    try {
      const response = await fetch(PROJECT_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: projectName.trim(),
          description: projectDescription.trim(),
        }),
      });

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      await readResponse(response);

      // Refresh the project list after successful creation.
      await refreshProjects();

      setProjectName("");
      setProjectDescription("");
      setShowProjectForm(false);
      setProjectSuccess("Project created successfully.");
    } catch (err) {
      console.error("Create project error:", err);
      setProjectError(
        err.message || "Unable to create project."
      );
    } finally {
      setCreatingProject(false);
    }
  }

  // Open or close member management.
  function toggleManageMembers(projectId) {
    setActiveManageProjectId((previousId) =>
      previousId === projectId ? null : projectId
    );

    setMemberEmail("");
    setMemberError("");
    setMemberSuccess("");
  }

  // Add an existing registered user as a project member.
  async function handleAddMember(event, projectId) {
    event.preventDefault();

    if (!memberEmail.trim()) {
      setMemberError("Please enter the user's email.");
      return;
    }

    setAddingMember(true);
    setMemberError("");
    setMemberSuccess("");

    try {
      const response = await fetch(
        `${PROJECT_API_URL}/${projectId}/members`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            email: memberEmail.trim(),
          }),
        }
      );

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      const data = await readResponse(response);

      await refreshProjects();

      setMemberEmail("");
      setMemberSuccess(
        data.message || "Project member added successfully."
      );
    } catch (err) {
      setMemberError(
        err.message || "Unable to add project member."
      );
    } finally {
      setAddingMember(false);
    }
  }

  // Remove a member from a project.
  async function handleRemoveMember(projectId, memberId) {
    if (!memberId) {
      setMemberError("Unable to identify this project member.");
      return;
    }

    const confirmed = window.confirm(
      "Remove this member from the project?"
    );

    if (!confirmed) return;

    setRemovingMemberId(memberId);
    setMemberError("");
    setMemberSuccess("");

    try {
      const response = await fetch(
        `${PROJECT_API_URL}/${projectId}/members/${memberId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      const data = await readResponse(response);

      await refreshProjects();

      setMemberSuccess(
        data.message || "Project member removed successfully."
      );
    } catch (err) {
      setMemberError(
        err.message || "Unable to remove project member."
      );
    } finally {
      setRemovingMemberId(null);
    }
  }

  // Delete a project.
  async function handleDeleteProject(projectId) {
    if (!projectId) return;

    const confirmed = window.confirm(
      "Delete this project and all notes linked to it? This action cannot be undone."
    );

    if (!confirmed) return;

    setDeletingProjectId(projectId);
    setProjectError("");
    setProjectSuccess("");

    try {
      const response = await fetch(
        `${PROJECT_API_URL}/${projectId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      const data = await readResponse(response);

      // Remove the deleted project from the visible list.
      setProjects((previousProjects) =>
        previousProjects.filter(
          (project) => String(project._id) !== String(projectId)
        )
      );

      if (String(selectedProjectId) === String(projectId)) {
        setNotes([]);
        navigate("/dashboard", { replace: true });
      }

      if (String(activeManageProjectId) === String(projectId)) {
        setActiveManageProjectId(null);
      }

      setProjectSuccess(
        data.message || "Project deleted successfully."
      );
    } catch (err) {
      console.error("Delete project error:", err);
      setProjectError(
        err.message || "Unable to delete project."
      );
    } finally {
      setDeletingProjectId(null);
    }
  }

  // Delete a note.
  async function handleDelete(noteId) {
    if (!noteId) return;

    try {
      const response = await fetch(`${API_URL}/${noteId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      await readResponse(response);

      setNotes((previousNotes) =>
        previousNotes.filter(
          (note) => (note._id || note.id) !== noteId
        )
      );
    } catch (err) {
      alert(err.message || "Unable to delete note.");
    }
  }

  // Search notes.
  const filteredNotes = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return notes;

    return notes.filter((note) =>
      `${note.title || ""} ${note.content || ""}`
        .toLowerCase()
        .includes(query)
    );
  }, [notes, search]);

  return (
    <div className="dashboard-page">
      <Navbar />

      <main className="dashboard-container">
        {/* Projects section */}
        <section className="projects-section">
          <div className="projects-heading">
            <div>
              <span className="dashboard-eyebrow">
                TEAM WORKSPACE
              </span>

              <h1>My Projects</h1>

              <p>
                Organize your work and collaborate on projects.
              </p>
            </div>

            <button
              type="button"
              className="dashboard-create-btn"
              onClick={() => {
                setShowProjectForm((previous) => !previous);
                setProjectError("");
                setProjectSuccess("");
              }}
            >
              {showProjectForm ? "Cancel" : "＋ Create Project"}
            </button>
          </div>

          {projectSuccess && (
            <p className="project-success" role="status">
              {projectSuccess}
            </p>
          )}

          {showProjectForm && (
            <form
              className="project-form"
              onSubmit={handleCreateProject}
            >
              <h2>Create a New Project</h2>

              <label htmlFor="project-name">
                Project Name
              </label>

              <input
                id="project-name"
                value={projectName}
                onChange={(event) =>
                  setProjectName(event.target.value)
                }
                placeholder="e.g. CollabSphere"
                maxLength={100}
                required
              />

              <label htmlFor="project-description">
                Description
              </label>

              <textarea
                id="project-description"
                value={projectDescription}
                onChange={(event) =>
                  setProjectDescription(event.target.value)
                }
                placeholder="What is this project about?"
                maxLength={1000}
                rows={4}
              />

              {projectError && (
                <p className="project-error" role="alert">
                  {projectError}
                </p>
              )}

              <button
                type="submit"
                className="dashboard-create-btn"
                disabled={creatingProject}
              >
                {creatingProject ? "Creating..." : "Save Project"}
              </button>
            </form>
          )}

          {!showProjectForm && projectError && (
            <div className="project-error" role="alert">
              <p>{projectError}</p>

              <button
                type="button"
                onClick={() => refreshProjects().catch((err) =>
                  setProjectError(err.message)
                )}
              >
                Retry
              </button>
            </div>
          )}

          {projectsLoading ? (
            <p className="projects-message">
              Loading projects...
            </p>
          ) : projects.length > 0 ? (
            <div className="projects-grid">
              {projects.map((project) => {
                const members = Array.isArray(project.members)
                  ? project.members
                  : [];

                // Owner can be an ID or a populated user object.
                const ownerValue =
                  project.owner ??
                  project.ownerId ??
                  project.createdBy ??
                  project.user;

                const ownerId =
                  ownerValue && typeof ownerValue === "object"
                    ? ownerValue._id ||
                      ownerValue.id ||
                      ownerValue.userId ||
                      ownerValue.sub
                    : ownerValue;

                const ownerEmail = (
                  ownerValue && typeof ownerValue === "object"
                    ? ownerValue.email || ""
                    : project.ownerEmail || ""
                ).toLowerCase();

                // Compare both user ID and email.
                const isOwner = Boolean(
                  (currentUserId &&
                    ownerId &&
                    String(currentUserId) === String(ownerId)) ||
                  (currentUserEmail &&
                    ownerEmail &&
                    currentUserEmail === ownerEmail)
                );

                const isManaging =
                  activeManageProjectId === project._id;

                const isSelected =
                  String(selectedProjectId) === String(project._id);

                return (
                  <article
                    className="project-card"
                    key={project._id}
                  >
                    <div className="project-card-icon">
                      <span aria-hidden="true">📁</span>
                    </div>

                    <h3>{project.name}</h3>

                    <p className="project-description">
                      {project.description ||
                        "No description provided."}
                    </p>

                    <button
                      type="button"
                      className="dashboard-create-btn"
                      onClick={() => {
                        setSearch("");
                        navigate(
                          `/dashboard?projectId=${project._id}`
                        );
                      }}
                    >
                      {isSelected
                        ? "Project Selected"
                        : "Open Project Notes"}
                    </button>

                    <div className="project-card-footer">
                      <span className="project-owner-label">
                        Owner
                      </span>

                      <span className="project-owner-email">
                        {typeof ownerValue === "object"
                          ? ownerValue?.email || "Project owner"
                          : ownerEmail || "Project owner"}
                      </span>
                    </div>

                    <div className="project-members-count">
                      {members.length}{" "}
                      {members.length === 1 ? "member" : "members"}
                    </div>

                    <div className="project-members-list">
                      <h4>Project Members</h4>

                      {members.length > 0 ? (
                        members.map((member, index) => {
                          const memberId =
                            typeof member === "object"
                              ? member?._id || member?.id || member?.userId
                              : member;

                          const email =
                            typeof member === "object"
                              ? member?.email || ""
                              : "";

                          const isProjectOwner =
                            ownerId &&
                            String(memberId) === String(ownerId);

                          return (
                            <div
                              className="project-member-row"
                              key={memberId || index}
                            >
                              <span className="project-member-email">
                                👤 {email || "Project member"}
                                {isProjectOwner ? " (Owner)" : ""}
                              </span>

                              {isOwner && !isProjectOwner && (
                                <button
                                  type="button"
                                  className="project-remove-member-btn"
                                  disabled={
                                    removingMemberId === memberId
                                  }
                                  onClick={() =>
                                    handleRemoveMember(
                                      project._id,
                                      memberId
                                    )
                                  }
                                >
                                  {removingMemberId === memberId
                                    ? "Removing..."
                                    : "Remove"}
                                </button>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <p>No members found.</p>
                      )}
                    </div>

                    {/* Delete Project is shown to the owner. */}
                    {isOwner && (
                      <button
                        type="button"
                        className="project-delete-btn"
                        disabled={
                          deletingProjectId === project._id
                        }
                        onClick={() =>
                          handleDeleteProject(project._id)
                        }
                      >
                        {deletingProjectId === project._id
                          ? "Deleting Project..."
                          : "Delete Project"}
                      </button>
                    )}

                    {isOwner && (
                      <button
                        type="button"
                        className="project-manage-btn"
                        onClick={() =>
                          toggleManageMembers(project._id)
                        }
                      >
                        {isManaging
                          ? "Close Member Management"
                          : "＋ Manage Members"}
                      </button>
                    )}

                    {isManaging && isOwner && (
                      <div className="project-members-panel">
                        <h4>Add a Project Member</h4>

                        <p>
                          Enter the email of an already registered user.
                        </p>

                        <form
                          className="project-add-member-form"
                          onSubmit={(event) =>
                            handleAddMember(event, project._id)
                          }
                        >
                          <label
                            htmlFor={`member-email-${project._id}`}
                          >
                            Registered User Email
                          </label>

                          <input
                            id={`member-email-${project._id}`}
                            type="email"
                            className="project-member-input"
                            placeholder="user@example.com"
                            value={memberEmail}
                            onChange={(event) =>
                              setMemberEmail(event.target.value)
                            }
                            required
                          />

                          <button
                            type="submit"
                            className="dashboard-create-btn"
                            disabled={addingMember}
                          >
                            {addingMember ? "Adding..." : "Add Member"}
                          </button>
                        </form>

                        {memberError && (
                          <p
                            className="project-member-error"
                            role="alert"
                          >
                            {memberError}
                          </p>
                        )}

                        {memberSuccess && (
                          <p
                            className="project-member-success"
                            role="status"
                          >
                            {memberSuccess}
                          </p>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="projects-empty">
              <h2>No projects yet</h2>

              <p>Create your first project to get started.</p>

              <button
                type="button"
                className="dashboard-create-btn"
                onClick={() => setShowProjectForm(true)}
              >
                ＋ Create Your First Project
              </button>
            </div>
          )}
        </section>

        {/* Notes section */}
        <section className="notes-section">
          <section className="dashboard-heading">
            <div>
              <span className="dashboard-eyebrow">
                YOUR WORKSPACE
              </span>

              <h1>
                {selectedProject
                  ? `${selectedProject.name} Notes`
                  : selectedProjectId
                    ? "Project Notes"
                    : "My Notes"}
              </h1>

              <p>
                {selectedProject
                  ? `Notes saved in the ${selectedProject.name} project.`
                  : selectedProjectId
                    ? "Loading project notes..."
                    : "Capture your ideas, organize your thoughts, and keep everything in one place."}
              </p>

              {selectedProjectId && (
                <button
                  type="button"
                  className="dashboard-secondary-btn"
                  onClick={() => {
                    setSearch("");
                    navigate("/dashboard");
                  }}
                >
                  Back to My Notes
                </button>
              )}
            </div>

            <button
              type="button"
              className="dashboard-create-btn"
              onClick={() =>
                navigate(
                  selectedProjectId
                    ? `/editor?projectId=${selectedProjectId}`
                    : "/editor"
                )
              }
            >
              ＋ Create Note
            </button>
          </section>

          <section className="dashboard-toolbar">
            <div className="dashboard-search">
              <span aria-hidden="true">⌕</span>

              <input
                type="search"
                placeholder="Search your notes..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                aria-label="Search notes"
              />

              {search && (
                <button
                  type="button"
                  className="dashboard-clear-search"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                >
                  ×
                </button>
              )}
            </div>

            <div className="dashboard-note-count">
              <strong>{notes.length}</strong>
              {notes.length === 1 ? " note" : " notes"}
            </div>
          </section>

          {loading ? (
            <div className="dashboard-message">
              <div className="dashboard-spinner" />
              <p>Loading your notes...</p>
            </div>
          ) : error ? (
            <div className="dashboard-message dashboard-error">
              <h2>Unable to load notes</h2>

              <p>{error}</p>

              <button
                type="button"
                className="dashboard-create-btn"
                onClick={() => window.location.reload()}
              >
                Try Again
              </button>
            </div>
          ) : filteredNotes.length > 0 ? (
            <section className="dashboard-notes-grid">
              {filteredNotes.map((note) => (
                <NoteCard
                  key={note._id || note.id}
                  note={note}
                  onDelete={handleDelete}
                  projectId={selectedProjectId}
                />
              ))}
            </section>
          ) : (
            <section className="dashboard-empty">
              <div className="dashboard-empty-icon">
                {search ? "⌕" : "✎"}
              </div>

              <h2>
                {search
                  ? "No matching notes"
                  : selectedProjectId
                    ? "No notes in this project yet"
                    : "Your workspace is empty"}
              </h2>

              <p>
                {search
                  ? "Try another keyword or clear your search."
                  : selectedProjectId
                    ? "Create the first note for this project."
                    : "Create your first note and start collecting your ideas."}
              </p>

              {search ? (
                <button
                  type="button"
                  className="dashboard-secondary-btn"
                  onClick={() => setSearch("")}
                >
                  Clear Search
                </button>
              ) : (
                <button
                  type="button"
                  className="dashboard-create-btn"
                  onClick={() =>
                    navigate(
                      selectedProjectId
                        ? `/editor?projectId=${selectedProjectId}`
                        : "/editor"
                    )
                  }
                >
                  ＋ Create Your First Note
                </button>
              )}
            </section>
          )}
        </section>
      </main>

      <AIChat />
    </div>
  );
}

export default Dashboard;
