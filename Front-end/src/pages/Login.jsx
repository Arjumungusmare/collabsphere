  import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import API_BASE_URL from "../api";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    if (loading) return;

    if (!email.trim() || !password) {
      setError("Email and password are required");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `${API_BASE_URL}/api/auth/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: email.trim().toLowerCase(),
            password,
          }),
        }
      );

      let data;

      try {
        data = await response.json();
      } catch {
        throw new Error("The server returned an invalid response");
      }

      if (!response.ok) {
        throw new Error(
          data.message || "Login failed. Please check your credentials."
        );
      }

      const token = data.token || data.accessToken;

      if (!token) {
        throw new Error("Authentication token was not received.");
      }

      localStorage.setItem("token", token);

      if (data.user) {
        localStorage.setItem("user", JSON.stringify(data.user));
      } else {
        localStorage.removeItem("user");
      }

      navigate("/dashboard", { replace: true });
    } catch (error) {
      console.error("LOGIN ERROR:", error);

      setError(
        error.message === "The server returned an invalid response"
          ? error.message
          : error instanceof TypeError
            ? "Unable to connect to server. Please check the backend URL and CORS settings."
            : error.message || "Login failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <span className="eyebrow">WELCOME BACK</span>

          <h1>Login to your account</h1>

          <p>
            Sign in to continue managing your notes and projects.
          </p>
        </div>

        {error && (
          <div className="error-message" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} autoComplete="off">
          {/* Dummy fields to discourage browser autofill */}
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              width: "1px",
              height: "1px",
              overflow: "hidden",
              clipPath: "inset(50%)",
            }}
          >
            <input
              type="text"
              name="username"
              tabIndex={-1}
              autoComplete="username"
            />
            <input
              type="password"
              name="password"
              tabIndex={-1}
              autoComplete="new-password"
            />
          </div>

          {/* Email */}
          <div className="form-group">
            <label htmlFor="login-email">Email</label>

            <input
              id="login-email"
              type="email"
              name="login-email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              required
            />
          </div>

          {/* Password */}
          <div className="form-group">
            <label htmlFor="login-password">Password</label>

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

          {/* Login Button */}
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
          <Link to="/register">Create Account</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;