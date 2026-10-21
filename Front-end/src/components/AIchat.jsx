
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import API_BASE_URL from "../api";
import "../style/AIchat.css";

const API_URL = `${API_BASE_URL}/api/ai/chat`;

function AIChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Hi! 👋 I'm your CollabNotes AI assistant. What would you like help with?",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copiedCode, setCopiedCode] = useState("");

  async function handleSend(event) {
    event.preventDefault();

    const question = message.trim();

    if (!question || loading) return;

    const token = localStorage.getItem("token");

    if (!token) {
      setError("Please log in to use the AI assistant.");
      return;
    }

    const history = messages.slice(1).map((item) => ({
      role: item.role === "assistant" ? "model" : "user",
      text: item.text,
    }));

    setMessage("");
    setError("");

    setMessages((previous) => [
      ...previous,
      { role: "user", text: question },
    ]);

    setLoading(true);

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: question,
          history,
        }),
      });

      let data;

      try {
        data = await response.json();
      } catch {
        throw new Error("The server returned an invalid response.");
      }

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to get an AI response."
        );
      }

      const reply = data.reply || data.response;

      if (typeof reply !== "string" || !reply.trim()) {
        throw new Error("The AI returned an empty response.");
      }

      setMessages((previous) => [
        ...previous,
        { role: "assistant", text: reply },
      ]);
    } catch (err) {
      setError(
        err.message || "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleCopyCode(code, codeId) {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(codeId);

      setTimeout(() => {
        setCopiedCode((previous) =>
          previous === codeId ? "" : previous
        );
      }, 2000);
    } catch (err) {
      console.error("Copy failed:", err);
      setError("Unable to copy code. Please copy it manually.");
    }
  }

  function renderMessage(item, index) {
    if (item.role === "user") {
      return item.text;
    }

    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          pre({ children }) {
            return <>{children}</>;
          },

          code({ children, className, ...props }) {
            const code = String(children).replace(/\n$/, "");
            const isBlock = /language-/.test(className || "");

            if (!isBlock) {
              return (
                <code className={className} {...props}>
                  {children}
                </code>
              );
            }

            const codeId = `${index}-${code}`;

            return (
              <div className="ai-code-block">
                <div className="ai-code-header">
                  <span>
                    {(className || "").replace("language-", "") || "Code"}
                  </span>

                  <button
                    type="button"
                    onClick={() => handleCopyCode(code, codeId)}
                  >
                    {copiedCode === codeId ? "Copied!" : "Copy"}
                  </button>
                </div>

                <pre>
                  <code className={className} {...props}>
                    {children}
                  </code>
                </pre>
              </div>
            );
          },
        }}
      >
        {item.text}
      </ReactMarkdown>
    );
  }

  return (
    <div className="ai-chat-widget">
      {isOpen && (
        <section
          className="ai-chat-window"
          aria-label="AI assistant"
        >
          <header className="ai-chat-header">
            <div className="ai-chat-avatar">AI</div>

            <div className="ai-chat-heading">
              <h2>CollabNotes AI</h2>

              <span>
                <span className="ai-online-dot" />
                Here to help
              </span>
            </div>

            <button
              type="button"
              className="ai-chat-close"
              onClick={() => setIsOpen(false)}
              aria-label="Close chat"
            >
              ×
            </button>
          </header>

          <div className="ai-chat-messages" aria-live="polite">
            {messages.map((item, index) => (
              <div
                key={`${index}-${item.role}`}
                className={`ai-chat-message ${
                  item.role === "user"
                    ? "user-message"
                    : "assistant-message"
                }`}
              >
                {renderMessage(item, index)}
              </div>
            ))}

            {loading && (
              <div
                className="ai-chat-message assistant-message ai-thinking"
                role="status"
              >
                <span className="ai-thinking-dot" />
                <span className="ai-thinking-dot" />
                <span className="ai-thinking-dot" />
                <span className="ai-thinking-text">Thinking...</span>
              </div>
            )}
          </div>

          {error && (
            <p className="ai-chat-error" role="alert">
              {error}
            </p>
          )}

          <form className="ai-chat-form" onSubmit={handleSend}>
            <input
              type="text"
              placeholder="Ask me anything..."
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              aria-label="Your message"
              disabled={loading}
            />

            <button
              type="submit"
              disabled={loading || !message.trim()}
              aria-label="Send message"
            >
              ↑
            </button>
          </form>

          <p className="ai-chat-disclaimer">
            AI can make mistakes. Verify important information.
          </p>
        </section>
      )}

      <button
        type="button"
        className={`ai-chat-launcher ${
          isOpen ? "chat-is-open" : ""
        }`}
        onClick={() => setIsOpen((previous) => !previous)}
        aria-label={isOpen ? "Close AI chat" : "Open AI chat"}
        aria-expanded={isOpen}
      >
        {isOpen ? "×" : "✦"}
      </button>
    </div>
  );
}

export default AIChat;