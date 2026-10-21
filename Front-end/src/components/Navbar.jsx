import { useNavigate } from "react-router-dom";
import "../style/Navbar.css";

function Navbar() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  function handleLogout() {
    localStorage.removeItem("token");
    navigate("/login", { replace: true });
  }

  return (
    <header className="app-navbar">
      <div className="navbar-inner">
        <button
          type="button"
          className="navbar-brand"
          onClick={() => navigate(token ? "/dashboard" : "/login")}
          aria-label="CollabNotes home"
        >
          <span className="navbar-logo">C</span>

          <span className="navbar-brand-text">
            Collab<span>Notes</span>
          </span>
        </button>

        <nav className="navbar-navigation" aria-label="Main navigation">
          {token ? (
            <>
              <button
                type="button"
                className="navbar-link"
                onClick={() => navigate("/dashboard")}
              >
                My Notes
              </button>

              <button
                type="button"
                className="navbar-create"
                onClick={() => navigate("/editor")}
              >
                <span aria-hidden="true">＋</span>
                New Note
              </button>

              <button
                type="button"
                className="navbar-logout"
                onClick={handleLogout}
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="navbar-link"
                onClick={() => navigate("/login")}
              >
                Log in
              </button>

              <button
                type="button"
                className="navbar-create"
                onClick={() => navigate("/register")}
              >
                Get Started
              </button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

export default Navbar;
