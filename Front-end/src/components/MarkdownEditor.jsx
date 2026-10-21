function MarkdownEditor({ content, setContent }) {
  return (
    <div className="editor-layout">
      <div className="editor-panel">
        <div className="panel-header">
          <span>Markdown</span>
        </div>

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="# Start writing...
          ## Example
          Write your note here..."
        />
      </div>

      <div className="preview-panel">
        <div className="panel-header">
          <span>Preview</span>
        </div>

        <div className="markdown-preview">
          {content ? (
            <pre>{content}</pre>
          ) : (
            <div className="empty-preview">
              Your Markdown preview will appear here.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MarkdownEditor;