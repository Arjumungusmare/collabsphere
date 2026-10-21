import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import API_BASE_URL from "../api";

function Register() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleRegister = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!email.trim() || !password.trim()) {
      setError("Email and password are required");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `${API_BASE_URL}/api/auth/register`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: email.trim(),
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
        setError(data.message || "Registration failed");
        return;
      }

      setSuccess(
        "Registration successful! Redirecting to login..."
      );

      // Clear form
      setEmail("");
      setPassword("");

      // Go to login after 1 second
      setTimeout(() => {
        navigate("/login");
      }, 1000);
    } catch (error) {
      console.error("REGISTER ERROR:", error);

      setError(
        error.message === "The server returned an invalid response"
          ? error.message
          : "Unable to connect to server. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <span className="eyebrow">GET STARTED</span>

          <h1>Create your account</h1>

          <p>
            Start creating and organizing your notes.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="error-message" role="alert">
            {error}
          </div>
        )}

        {/* Success */}
        {success && (
          <div className="success-message" role="status">
            {success}
          </div>
        )}

        <form
          onSubmit={handleRegister}
          autoComplete="off"
        >
          {/* Email */}
          <div className="form-group">
            <label htmlFor="register-email">
              Email
            </label>

            <input
              id="register-email"
              type="email"
              name="register-email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="off"
              required
            />
          </div>

          {/* Password */}
          <div className="form-group">
            <label htmlFor="register-password">
              Password
            </label>

            <input
              id="register-password"
              type="password"
              name="register-password"
              placeholder="Create a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              minLength={6}
              required
            />
          </div>

          {/* Register Button */}
          <button
            type="submit"
            className="primary-btn auth-btn"
            disabled={loading}
          >
            {loading
              ? "Creating account..."
              : "Create Account"}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account?{" "}
          <Link to="/login">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Register;