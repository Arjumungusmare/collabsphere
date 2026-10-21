import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

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
        "http://localhost:5000/api/auth/register",
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

      setError("Unable to connect to server");
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
          <div className="error-message">
            {error}
          </div>
        )}

        {/* Success */}

        {success && (
          <div className="success-message">
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