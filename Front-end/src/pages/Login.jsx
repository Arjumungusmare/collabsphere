import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();

    setError("");

    if (!email.trim() || !password.trim()) {
      setError("Email and password are required");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        "http://localhost:5000/api/auth/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Login failed");
        return;
      }

      // Store JWT only after successful login
      localStorage.setItem("token", data.token);

      // Clear form values
      setEmail("");
      setPassword("");

      // Go to dashboard
      navigate("/dashboard");
    } catch (error) {
      console.error("LOGIN ERROR:", error);
      setError("Unable to connect to server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">

        <div className="auth-header">
          <span className="eyebrow">WELCOME BACK</span>

          <h1>Login to CollabNotes</h1>

          <p>
            Continue working on your notes and ideas.
          </p>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <form
          onSubmit={handleLogin}
          autoComplete="off"
        >
          {/* Email */}

          <div className="form-group">
            <label htmlFor="login-email">
              Email
            </label>

            <input
              id="login-email"
              type="email"
              name="login-email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="off"
              required
            />
          </div>

          {/* Password */}

          <div className="form-group">
            <label htmlFor="login-password">
              Password
            </label>

            <input
              id="login-password"
              type="password"
              name="login-password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>

          {/* Login button */}

          <button
            type="submit"
            className="primary-btn auth-btn"
            disabled={loading}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <p className="auth-footer">
          Don't have an account?{" "}
          <Link to="/register">
            Create one
          </Link>
        </p>

      </div>
    </div>
  );
}

export default Login;