
import { useNavigate } from "react-router-dom";
import "../style/NoteCard.css";

function NoteCard({ note, onDelete }) {
  const navigate = useNavigate();

  const title = note.title || "Untitled Note";
  const content = note.content || "No content yet.";
  const noteId = note._id || note.id;

  const formattedDate = note.updatedAt
    ? new Date(note.updatedAt).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
    : "Recently created";

  function handleEdit() {
    navigate(`/editor/${noteId}`);
  }

  function handleDelete() {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${title}"?`
    );

    if (confirmed && onDelete) {
      onDelete(noteId);
    }
  }

  return (
    <article className="note-card">
      <div className="note-card-top">
        <div className="note-card-icon" aria-hidden="true">
          ✎
        </div>

        <span className="note-card-status">Saved note</span>
      </div>

      <h2 className="note-card-title">{title}</h2>

      <p className="note-card-content">{content}</p>

      <div className="note-card-footer">
        <span className="note-card-date">{formattedDate}</span>

        <div className="note-card-actions">
          <button
            type="button"
            className="note-card-edit"
            onClick={handleEdit}
            aria-label={`Edit ${title}`}
          >
            Edit <span aria-hidden="true">↗</span>
          </button>

          <button
            type="button"
            className="note-card-delete"
            onClick={handleDelete}
            aria-label={`Delete ${title}`}
          >
            Delete
          </button>
        </div>
      </div>
    </article>
  );
}

export default NoteCard;