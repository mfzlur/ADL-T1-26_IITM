import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthProvider";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { useAuth } from "./hooks/useAuth";

import Login from "./pages/Login";
import Register from "./pages/Register";
import LandingPage from "./pages/LandingPage";
import AdminDashboard from "./pages/AdminDashboard";
import CoachDashboard from "./pages/CoachDashboard";
import PlayerDashboard from "./pages/PlayerDashboard";
import BrowsePage from "./pages/BrowsePage";
import AnalyticsPage from "./pages/AnalyticsPage";
import ClassDetailPage from "./pages/ClassDetailPage";
import CoachProfilePage from "./pages/CoachProfilePage";
import BrowseCoachesPage from "./pages/BrowseCoachesPage";

const RootRedirect = () => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <LandingPage />;
  return <Navigate to={`/${user.role}`} replace />;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/browse" element={<BrowsePage />} />
          <Route path="/coaches" element={<BrowseCoachesPage />} />
          <Route path="/class/:id" element={<ClassDetailPage />} />
          <Route path="/coach/:id" element={<CoachProfilePage />} />

          {/* Root — landing or redirect */}
          <Route path="/" element={<RootRedirect />} />

          {/* Protected — Admin */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* Protected — Coach */}
          <Route
            path="/coach"
            element={
              <ProtectedRoute allowedRoles={["coach"]}>
                <CoachDashboard />
              </ProtectedRoute>
            }
          />

          {/* Protected — Coach Analytics */}
          <Route
            path="/analytics"
            element={
              <ProtectedRoute allowedRoles={["coach"]}>
                <AnalyticsPage />
              </ProtectedRoute>
            }
          />

          {/* Protected — Player */}
          <Route
            path="/player"
            element={
              <ProtectedRoute allowedRoles={["player"]}>
                <PlayerDashboard />
              </ProtectedRoute>
            }
          />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
