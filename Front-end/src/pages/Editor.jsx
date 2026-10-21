
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import API_BASE_URL from "../api";
import "../style/Editor.css";

const API_URL = `${API_BASE_URL}/api/notes`;
const AI_URL = `${API_BASE_URL}/api/ai/chat`;
const ATTACHMENT_URL = `${API_BASE_URL}/api/attachments`;

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_EXTENSIONS = [
  ".txt", ".md", ".js", ".jsx", ".ts", ".tsx",
  ".py", ".json", ".css", ".html",
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".pdf",
];

const TEXT_EXTENSIONS = [
  ".txt", ".md", ".js", ".jsx", ".ts", ".tsx",
  ".py", ".json", ".css", ".html",
];

function getExtension(filename = "") {
  return filename.slice(filename.lastIndexOf(".")).toLowerCase();
}

function formatSize(bytes = 0) {
  if (bytes < 1024) return `${bytes} B`;

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function Editor() {
  const navigate = useNavigate();
  const { id } = useParams();
  const previewUrlRef = useRef(null);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [preview, setPreview] = useState(false);

  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [explaining, setExplaining] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [suggestions, setSuggestions] = useState("");
  const [explanation, setExplanation] = useState("");

  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [fileError, setFileError] = useState("");
  const [fileSuccess, setFileSuccess] = useState("");

  const [previewFile, setPreviewFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewText, setPreviewText] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");

  const handleUnauthorized = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  // Load an existing note.
  useEffect(() => {
    let cancelled = false;

    if (!id) {
      setTitle("");
      setContent("");
      setAttachments([]);
      setLoading(false);
      setError("");
      return;
    }

    const loadNote = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(`${API_URL}/${id}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });

        if (response.status === 401) {
          handleUnauthorized();
          return;
        }

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Failed to load note.");
        }

        if (cancelled) return;

        const note = data.note || data;

        setTitle(note.title || "");
        setContent(note.content || "");
        setAttachments(note.attachments || []);
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Unable to load note.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadNote();

    return () => {
      cancelled = true;
    };
  }, [id]);

  // Release object URLs when the component unmounts.
  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  const closePreview = () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }

    setPreviewFile(null);
    setPreviewUrl("");
    setPreviewText("");
    setPreviewError("");
    setPreviewLoading(false);
  };

  // Save the note.
  const handleSave = async (event) => {
    event.preventDefault();

    if (!title.trim()) {
      setError("Please enter a note title.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        id ? `${API_URL}/${id}` : API_URL,
        {
          method: id ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            title: title.trim(),
            content,
          }),
        }
      );

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to save note.");
      }

      setTitle("");
      setContent("");
      setPreview(false);
      setSuggestions("");
      setExplanation("");
      setAttachments([]);
      setFileError("");
      setFileSuccess("");
      setError("");
      closePreview();

      if (id) {
        navigate("/editor", { replace: true });
      }

      setSuccess("Note saved successfully! The editor is now empty.");
    } catch (err) {
      setError(err.message || "Unable to save note.");
    } finally {
      setSaving(false);
    }
  };

  // Shared helper for Gemini AI requests.
  const askAI = async (message) => {
    const response = await fetch(AI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({ message }),
    });

    if (response.status === 401) {
      handleUnauthorized();
      throw new Error("Session expired. Please log in again.");
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "AI request failed.");
    }

    return data.reply || "No response was returned.";
  };

  // Ask AI to suggest improvements.
  const handleSuggestImprovements = async () => {
    if (!content.trim()) {
      setError("Add some note content before requesting suggestions.");
      return;
    }

    setSuggesting(true);
    setSuggestions("");
    setError("");

    try {
      const reply = await askAI(
        "Review this note and suggest practical improvements. " +
        "Do not modify the original note. Keep the answer concise " +
        "and use Markdown.\n\n" +
        `Title: ${title}\n\nContent:\n${content}`
      );

      setSuggestions(reply);
    } catch (err) {
      setError(err.message || "Unable to get AI suggestions.");
    } finally {
      setSuggesting(false);
    }
  };

  // Ask AI to explain the note.
  const handleExplainNote = async () => {
    if (!content.trim()) {
      setError("Add some note content before requesting an explanation.");
      return;
    }

    setExplaining(true);
    setExplanation("");
    setError("");

    try {
      const reply = await askAI(
        "Explain this note in simple English for a beginner. " +
        "Explain the main idea, important points, and technical " +
        "terms. Use headings and short examples where helpful. " +
        "Keep the answer concise and do not change the original note.\n\n" +
        `Title: ${title}\n\nContent:\n${content}`
      );

      setExplanation(reply);
    } catch (err) {
      setError(err.message || "Unable to explain this note.");
    } finally {
      setExplaining(false);
    }
  };

  // Upload a file to the current saved note.
  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    setFileError("");
    setFileSuccess("");

    if (!id) {
      setFileError("Save the note first before uploading files.");
      return;
    }

    if (!ALLOWED_EXTENSIONS.includes(getExtension(file.name))) {
      setFileError("This file type is not supported.");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setFileError("File size must be 5 MB or less.");
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${ATTACHMENT_URL}/${id}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: formData,
      });

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "File upload failed.");
      }

      if (data.attachment) {
        setAttachments((previous) => [
          ...previous,
          data.attachment,
        ]);
      }

      setFileSuccess("File uploaded successfully.");
    } catch (err) {
      setFileError(err.message || "Unable to upload file.");
    } finally {
      setUploading(false);
    }
  };

  // Fetch an attachment with authentication.
  const fetchAttachmentBlob = async (file, download = false) => {
    if (!id || !file._id) {
      throw new Error("Attachment information is incomplete.");
    }

    const query = download ? "?download=true" : "";

    const response = await fetch(
      `${ATTACHMENT_URL}/${id}/${file._id}${query}`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    );

    if (response.status === 401) {
      handleUnauthorized();
      throw new Error("Session expired. Please log in again.");
    }

    if (!response.ok) {
      let message = "Unable to access this file.";

      try {
        const data = await response.json();
        message = data.message || message;
      } catch {
        // Keep the fallback message.
      }

      throw new Error(message);
    }

    return response.blob();
  };

  // Preview text, code, images and PDFs.
  const handlePreview = async (file) => {
    closePreview();
    setPreviewFile(file);
    setPreviewLoading(true);

    try {
      const extension = getExtension(file.originalName);
      const blob = await fetchAttachmentBlob(file);

      if (TEXT_EXTENSIONS.includes(extension)) {
        const text = await blob.text();

        if (text.length > 1_000_000) {
          throw new Error("This text file is too large to preview.");
        }

        setPreviewText(text);
      } else if (
        [".png", ".jpg", ".jpeg", ".gif", ".webp", ".pdf"].includes(
          extension
        )
      ) {
        const objectUrl = URL.createObjectURL(blob);
        previewUrlRef.current = objectUrl;
        setPreviewUrl(objectUrl);
      } else {
        throw new Error("Preview is not supported for this file.");
      }
    } catch (err) {
      setPreviewError(err.message || "Unable to preview file.");
    } finally {
      setPreviewLoading(false);
    }
  };

  // Download an attachment.
  const handleDownload = async (file) => {
    setFileError("");
    setFileSuccess("");

    let objectUrl;

    try {
      const blob = await fetchAttachmentBlob(file, true);
      objectUrl = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = file.originalName || "attachment";

      document.body.appendChild(link);
      link.click();
      link.remove();

      setFileSuccess("Download started.");
    } catch (err) {
      setFileError(err.message || "Download failed.");
    } finally {
      if (objectUrl) {
        setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      }
    }
  };

  if (loading) {
    return (
      <div className="editor-page">
        <Navbar />
        <main className="editor-container">
          <p>Loading note...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="editor-page">
      <Navbar />

      <main className="editor-container">
        <div className="editor-heading">
          <h1>{id ? "Edit Note" : "Create Note"}</h1>
          <p>Write, organize, and attach files to your notes.</p>
        </div>

        {error && (
          <div className="editor-message editor-error" role="alert">
            {error}
          </div>
        )}

        {success && (
          <div className="editor-message editor-success" role="status">
            {success}
          </div>
        )}

        <form className="editor-card" onSubmit={handleSave}>
          <label htmlFor="note-title">Note title</label>

          <input
            id="note-title"
            className="editor-title-input"
            type="text"
            placeholder="Enter note title..."
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={200}
            required
          />

          <div className="editor-actions">
            <button
              type="button"
              className="editor-secondary-button"
              onClick={() => setPreview((previous) => !previous)}
            >
              {preview ? "Edit Markdown" : "Preview Markdown"}
            </button>

            <button
              type="submit"
              className="editor-primary-button"
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Note"}
            </button>
          </div>

          {preview ? (
            <div className="editor-markdown-preview">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {content || "*Nothing to preview yet.*"}
              </ReactMarkdown>
            </div>
          ) : (
            <textarea
              className="editor-content-input"
              placeholder="Write your note in Markdown..."
              value={content}
              onChange={(event) => setContent(event.target.value)}
              rows={14}
            />
          )}
        </form>

        <section className="attachments-section">
          <h2>Files & Attachments</h2>

          <p className="attachments-description">
            Supported files: text, code, images and PDF.
            Maximum 5 MB per file.
          </p>

          <label className="upload-file-button">
            {uploading ? "Uploading..." : "Choose File"}

            <input
              type="file"
              accept={ALLOWED_EXTENSIONS.join(",")}
              onChange={handleFileUpload}
              disabled={uploading || !id}
              hidden
            />
          </label>

          {!id && (
            <p className="attachments-description">
              Save the note first. Then upload your files.
            </p>
          )}

          {fileError && (
            <p className="attachment-error" role="alert">
              {fileError}
            </p>
          )}

          {fileSuccess && (
            <p className="attachment-success" role="status">
              {fileSuccess}
            </p>
          )}

          {attachments.length === 0 ? (
            <p className="attachments-empty">No files attached yet.</p>
          ) : (
            <div className="attachments-list">
              {attachments.map((file) => (
                <div
                  className="attachment-item"
                  key={file._id || file.storedName}
                >
                  <div className="attachment-info">
                    <span className="attachment-name">
                      {file.originalName}
                    </span>

                    <span className="attachment-size">
                      {formatSize(file.size)}
                    </span>
                  </div>

                  <div className="attachment-actions">
                    <button
                      type="button"
                      onClick={() => handlePreview(file)}
                    >
                      Preview
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDownload(file)}
                    >
                      Download
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {previewFile && (
          <section className="attachment-preview">
            <div className="attachment-preview-header">
              <h2>{previewFile.originalName}</h2>

              <button type="button" onClick={closePreview}>
                Close Preview
              </button>
            </div>

            {previewLoading && <p>Loading preview...</p>}

            {previewError && (
              <p className="attachment-error" role="alert">
                {previewError}
              </p>
            )}

            {!previewLoading && !previewError && previewText !== "" && (
              <pre className="attachment-text-preview">
                <code>{previewText}</code>
              </pre>
            )}

            {!previewLoading &&
              !previewError &&
              previewUrl &&
              getExtension(previewFile.originalName) !== ".pdf" && (
                <img
                  className="attachment-image-preview"
                  src={previewUrl}
                  alt={previewFile.originalName}
                />
              )}

            {!previewLoading &&
              !previewError &&
              previewUrl &&
              getExtension(previewFile.originalName) === ".pdf" && (
                <iframe
                  className="attachment-pdf-preview"
                  src={previewUrl}
                  title={`Preview of ${previewFile.originalName}`}
                />
              )}
          </section>
        )}

        <section className="editor-ai-section">
          <div className="editor-ai-heading">
            <div>
              <h2>AI Note Assistant</h2>
              <p>
                Get suggestions or understand your note with Gemini AI.
              </p>
            </div>

            <div className="editor-ai-buttons">
              <button
                type="button"
                className="editor-ai-button"
                onClick={handleSuggestImprovements}
                disabled={
                  suggesting || explaining || !content.trim()
                }
              >
                {suggesting ? "Thinking..." : "Suggest Improvements"}
              </button>

              <button
                type="button"
                className="editor-ai-button"
                onClick={handleExplainNote}
                disabled={
                  explaining || suggesting || !content.trim()
                }
              >
                {explaining
                  ? "Explaining..."
                  : "Explain This Note Content"}
              </button>
            </div>
          </div>

          {suggestions && (
            <div className="editor-suggestions">
              <h3>Suggested Improvements</h3>

              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {suggestions}
              </ReactMarkdown>
            </div>
          )}

          {explanation && (
            <div className="editor-suggestions">
              <h3>AI Explanation</h3>

              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {explanation}
              </ReactMarkdown>
            </div>
          )}
        </section>

        <div className="editor-bottom">
          <button
            type="button"
            className="editor-secondary-button"
            onClick={() => navigate("/dashboard")}
          >
            Back to Dashboard
          </button>
        </div>
      </main>
    </div>
  );
}

export default Editor;
