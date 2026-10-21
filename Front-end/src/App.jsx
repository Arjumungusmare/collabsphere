
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Editor from "./pages/Editor";

// Get the logged-in user's information from localStorage or JWT
export function getStoredUser() {
  const storedUser = localStorage.getItem("user");

  if (storedUser) {
    try {
      return JSON.parse(storedUser);
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

    return {
      email: payload.email || payload.user?.email || "",
      userId:
        payload.userId ||
        payload.id ||
        payload._id ||
        payload.user?.id ||
        payload.user?._id ||
        "",
    };
  } catch (error) {
    console.error("Unable to read user from token:", error);
    return null;
  }
}

// Protect pages that require authentication
function ProtectedRoute({ children }) {
  const token = localStorage.getItem("token");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

// Prevent logged-in users from opening login/register pages
function PublicRoute({ children }) {
  const token = localStorage.getItem("token");

  if (token) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Default route */}
        <Route
          path="/"
          element={<Navigate to="/dashboard" replace />}
        />

        {/* Authentication */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />

        <Route
          path="/register"
          element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          }
        />

        {/* Dashboard */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* Create note */}
        <Route
          path="/editor"
          element={
            <ProtectedRoute>
              <Editor />
            </ProtectedRoute>
          }
        />

        {/* Edit note */}
        <Route
          path="/editor/:id"
          element={
            <ProtectedRoute>
              <Editor />
            </ProtectedRoute>
          }
        />

        {/* Unknown routes */}
        <Route
          path="*"
          element={<Navigate to="/dashboard" replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
