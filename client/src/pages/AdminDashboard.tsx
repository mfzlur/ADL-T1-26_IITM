import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../hooks/useAuth";
import api from "../utils/api";
import AdminPaginator from "../components/AdminPaginator";

// ── Types ──────────────────────────────────────────────────────────────────────
interface Analytics {
  users: {
    total: number;
    coaches: number;
    players: number;
    admins: number;
    pending_coaches: number;
  };
  masterclasses: { total: number };
  enrollments: { total: number; active: number; waitlisted: number };
  top_classes: {
    mc_title: string;
    mc_category: string;
    mc_capacity: string;
    coach_name: string;
    enrollment_count: string;
  }[];
  recent_activity: {
    id: string;
    enrolled_at: string;
    status: string;
    player: { name: string };
    masterclass: { title: string };
  }[];
}

interface PendingCoach {
  id: string;
  name: string;
  email: string;
  created_at: string;
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  is_approved: boolean;
  created_at: string;
}

interface AdminMasterclass {
  id: string;
  title: string;
  session_date: string;
  category: string;
  capacity: number;
  enrolled_count: number;
  seats_remaining: number;
  created_at: string;
  updated_at: string;
  coach: { name: string };
}

interface AdminReview {
  id: number;
  rating: number;
  comment: string | null;
  created_at: string;
  player_name: string;
  masterclass_title: string;
  coach_name: string;
}

interface KickRequest {
  id: string;
  reason: string;
  status: string;
  created_at: string;
  coach: { name: string; email: string };
  player: { name: string; email: string };
  masterclass: { title: string };
}

interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  total_pages: number;
}

type Tab = "overview" | "coaches" | "users" | "classes" | "reviews" | "kick_requests";

// ── Category + role colours ────────────────────────────────────────────────────
const CATEGORY_COLORS: Record<string, string> = {
  opening: "bg-blue-500/20 text-blue-400",
  middlegame: "bg-purple-500/20 text-purple-400",
  endgame: "bg-amber-500/20 text-amber-400",
  tactics: "bg-red-500/20 text-red-400",
};

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-purple-500/20 text-purple-400",
  coach: "bg-amber-500/20 text-amber-400",
  player: "bg-emerald-500/20 text-emerald-400",
};

const wasEdited = (created: string, updated: string) =>
  updated && new Date(updated).getTime() - new Date(created).getTime() > 5000;

// ── Error helper ───────────────────────────────────────────────────────────────
const getErrMsg = (err: unknown, fallback: string): string => {
  if (err && typeof err === "object" && "response" in err) {
    const r = (err as { response?: { data?: { message?: string } } }).response;
    return r?.data?.message ?? fallback;
  }
  return fallback;
};

// ── Component ──────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [message, setMessage] = useState("");

  // ── Overview ─────────────────────────────────────────────────────────────────
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // ── Coaches (pending) ────────────────────────────────────────────────────────
  const [pending, setPending] = useState<PendingCoach[]>([]);
  const [coachesLoading, setCoachesLoading] = useState(false);

  // ── Users (paginated) ────────────────────────────────────────────────────────
  const [usersResp, setUsersResp] = useState<Paginated<AdminUser> | null>(null);
  const [usersPage, setUsersPage] = useState(1);
  const [usersRole, setUsersRole] = useState("");
  const [usersLoading, setUsersLoading] = useState(false);

  // ── Classes (paginated) ──────────────────────────────────────────────────────
  const [classesResp, setClassesResp] =
    useState<Paginated<AdminMasterclass> | null>(null);
  const [classesPage, setClassesPage] = useState(1);
  const [classesLoading, setClassesLoading] = useState(false);

  // ── Reviews ──────────────────────────────────────────────────────────────────
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  // ── Kick Requests ────────────────────────────────────────────────────────────
  const [kickRequests, setKickRequests] = useState<KickRequest[]>([]);
  const [kickReqLoading, setKickReqLoading] = useState(false);

  // ── Flash helper ─────────────────────────────────────────────────────────────
  const flash = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(""), 4000);
  };

  // ── fetchPending — declared before the useEffect that calls it ───────────────
  const fetchPending = useCallback(async () => {
    setCoachesLoading(true);
    try {
      const r = await api.get("/admin/coaches/pending");
      setPending(r.data);
    } finally {
      setCoachesLoading(false);
    }
  }, []);

  // ── Effects ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (activeTab !== "overview") return;
    void (async () => {
      setAnalyticsLoading(true);
      try {
        const r = await api.get("/admin/analytics");
        setAnalytics(r.data);
      } finally {
        setAnalyticsLoading(false);
      }
    })();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== "coaches") return;
    void (async () => { await fetchPending(); })();
  }, [activeTab, fetchPending]);

  useEffect(() => {
    if (activeTab !== "users") return;
    void (async () => {
      setUsersLoading(true);
      const params = new URLSearchParams({ page: String(usersPage), limit: "20" });
      if (usersRole) params.append("role", usersRole);
      try {
        const r = await api.get(`/admin/users?${params}`);
        setUsersResp(r.data);
      } finally {
        setUsersLoading(false);
      }
    })();
  }, [activeTab, usersPage, usersRole]);

  useEffect(() => {
    if (activeTab !== "classes") return;
    void (async () => {
      setClassesLoading(true);
      try {
        const r = await api.get(`/admin/masterclasses?page=${classesPage}&limit=15`);
        setClassesResp(r.data);
      } finally {
        setClassesLoading(false);
      }
    })();
  }, [activeTab, classesPage]);

  useEffect(() => {
    if (activeTab !== "reviews") return;
    void (async () => {
      setReviewsLoading(true);
      try {
        const r = await api.get("/admin/reviews");
        setReviews(r.data);
      } finally {
        setReviewsLoading(false);
      }
    })();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== "kick_requests") return;
    void (async () => {
      setKickReqLoading(true);
      try {
        const r = await api.get("/admin/kick-requests");
        setKickRequests(r.data);
      } finally {
        setKickReqLoading(false);
      }
    })();
  }, [activeTab]);

  // ── Actions ──────────────────────────────────────────────────────────────────
  const handleApprove = async (id: string, name: string) => {
    try {
      await api.put(`/admin/coaches/${id}/approve`);
      flash(`✓ ${name} approved`);
      void fetchPending();
    } catch (err: unknown) {
      flash(getErrMsg(err, "Failed to approve coach"));
    }
  };

  const handleSuspend = async (id: string, name: string) => {
    if (!confirm(`Suspend ${name}? They will lose login access.`)) return;
    try {
      await api.put(`/admin/coaches/${id}/suspend`);
      flash(`${name} has been suspended`);
      void fetchPending();
    } catch (err: unknown) {
      flash(getErrMsg(err, "Failed to suspend coach"));
    }
  };

  const handleForceDelete = async (id: string, title: string) => {
    if (!confirm(`Force-remove "${title}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/admin/masterclasses/${id}`);
      flash(`"${title}" removed`);
      setClassesResp((prev) =>
        prev
          ? {
              ...prev,
              data: prev.data.filter((mc) => mc.id !== id),
              total: prev.total - 1,
            }
          : prev,
      );
    } catch (err: unknown) {
      flash(getErrMsg(err, "Failed to delete class"));
    }
  };

  const handleDeleteReview = async (id: number) => {
    if (!confirm("Remove this review? This cannot be undone.")) return;
    try {
      await api.delete(`/admin/reviews/${id}`);
      setReviews((prev) => prev.filter((r) => r.id !== id));
      flash("Review removed");
    } catch (err: unknown) {
      flash(getErrMsg(err, "Failed to remove review"));
    }
  };

  const handleResolveKick = async (id: string, action: "approve" | "reject") => {
    if (!confirm(`Are you sure you want to ${action} this kick request?`)) return;
    try {
      await api.put(`/admin/kick-requests/${id}/${action}`);
      flash(`Kick request ${action}d`);
      setKickRequests((prev) =>
        prev.map((req) =>
          req.id === id ? { ...req, status: `${action}d` } : req,
        ),
      );
    } catch (err: unknown) {
      flash(getErrMsg(err, `Failed to ${action} request`));
    }
  };

  // ── Tab definitions ───────────────────────────────────────────────────────────
  const tabs: { id: Tab; label: string; badge?: number }[] = [
    { id: "overview", label: "📊 Overview" },
    {
      id: "coaches",
      label: "🏆 Coaches",
      badge: analytics?.users.pending_coaches,
    },
    { id: "users", label: "👥 Users", badge: usersResp?.total },
    { id: "classes", label: "♟ Classes", badge: classesResp?.total },
    { id: "reviews", label: "★ Reviews", badge: reviews.length },
    {
      id: "kick_requests",
      label: "🚫 Kicks",
      badge:
        kickRequests.filter((r) => r.status === "pending").length || undefined,
    },
  ];

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* ── Header ── */}
      <header
        className="bg-slate-900 border-b border-slate-800 px-6 py-4
        flex justify-between items-center sticky top-0 z-10"
      >
        <div className="flex items-center gap-3">
          <a href="/" className="flex items-center gap-2 hover:opacity-80 transition">
            <span className="text-2xl">♟</span>
            <span className="font-bold text-lg">Chess Arena</span>
          </a>
          <span
            className="text-xs px-2 py-0.5 rounded-full
            bg-purple-500/20 text-purple-400 font-medium"
          >
            Admin
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full bg-purple-500/20
            flex items-center justify-center text-purple-400
            font-bold text-sm"
          >
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <span className="text-sm text-slate-300 hidden sm:block">
            {user?.name}
          </span>
          <button
            onClick={logout}
            className="text-xs text-slate-500 hover:text-slate-300 transition"
          >
            Sign out
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* ── Page title ── */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">Platform management</p>
        </div>

        {/* ── Flash message ── */}
        {message && (
          <div
            className="bg-emerald-500/10 border border-emerald-500/30
            text-emerald-400 rounded-xl px-4 py-3 mb-6 text-sm
            flex justify-between items-center"
          >
            <span>{message}</span>
            <button
              onClick={() => setMessage("")}
              className="text-emerald-600 hover:text-emerald-400 transition ml-4"
            >
              ✕
            </button>
          </div>
        )}

        {/* ── Tabs ── */}
        <div
          className="flex gap-1 bg-slate-900 border border-slate-800
          rounded-xl p-1 w-fit mb-6 flex-wrap"
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg
                text-sm font-medium transition ${
                  activeTab === tab.id
                    ? "bg-slate-800 text-white"
                    : "text-slate-500 hover:text-slate-300"
                }`}
            >
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span
                  className={`text-xs px-1.5 py-0.5 rounded-full ${
                    tab.id === "coaches" && tab.badge > 0
                      ? "bg-amber-500/20 text-amber-400"
                      : activeTab === tab.id
                        ? "bg-slate-700 text-slate-300"
                        : "bg-slate-800 text-slate-500"
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ════════════════════════════════════════════════════════════ */}
        {/* TAB: OVERVIEW                                                */}
        {/* ════════════════════════════════════════════════════════════ */}
        {activeTab === "overview" && (
          <div className="space-y-8">
            {analyticsLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="bg-slate-900 border border-slate-800
                    rounded-2xl p-5 animate-pulse h-24"
                  />
                ))}
              </div>
            ) : analytics ? (
              <>
                {/* KPI grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    {
                      label: "Total Users",
                      value: analytics.users.total,
                      color: "text-white",
                    },
                    {
                      label: "Active Players",
                      value: analytics.users.players,
                      color: "text-emerald-400",
                    },
                    {
                      label: "Coaches",
                      value: analytics.users.coaches,
                      color: "text-amber-400",
                    },
                    {
                      label: "Pending Approval",
                      value: analytics.users.pending_coaches,
                      color:
                        analytics.users.pending_coaches > 0
                          ? "text-red-400"
                          : "text-slate-500",
                    },
                    {
                      label: "Total Classes",
                      value: analytics.masterclasses.total,
                      color: "text-blue-400",
                    },
                    {
                      label: "Total Enrollments",
                      value: analytics.enrollments.total,
                      color: "text-white",
                    },
                    {
                      label: "Active Enrollments",
                      value: analytics.enrollments.active,
                      color: "text-emerald-400",
                    },
                    {
                      label: "Waitlisted",
                      value: analytics.enrollments.waitlisted,
                      color: "text-amber-400",
                    },
                  ].map(({ label, value, color }) => (
                    <div
                      key={label}
                      className="bg-slate-900 border border-slate-800
                        rounded-2xl p-5"
                    >
                      <p className="text-slate-500 text-xs mb-1">{label}</p>
                      <p className={`text-3xl font-bold tabular-nums ${color}`}>
                        {value}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Top 5 classes */}
                {analytics.top_classes.length > 0 && (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                    <h3 className="font-semibold text-white mb-4 text-sm">
                      Top 5 Masterclasses by Enrollment
                    </h3>
                    <div className="space-y-3">
                      {analytics.top_classes.map((cls, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between gap-4"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span
                              className="text-slate-600 text-xs
                              tabular-nums w-4 flex-shrink-0"
                            >
                              {i + 1}
                            </span>
                            <div className="min-w-0">
                              <p className="text-white text-sm truncate">
                                {cls.mc_title}
                              </p>
                              <p className="text-slate-500 text-xs">
                                by {cls.coach_name}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full
                              capitalize font-medium
                              ${CATEGORY_COLORS[cls.mc_category] || "bg-slate-700 text-slate-400"}`}
                            >
                              {cls.mc_category}
                            </span>
                            <span
                              className="text-emerald-400 font-medium
                              tabular-nums text-sm"
                            >
                              {cls.enrollment_count}
                              <span className="text-slate-600 text-xs ml-1">
                                / {cls.mc_capacity}
                              </span>
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent activity */}
                {analytics.recent_activity.length > 0 && (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                    <h3 className="font-semibold text-white mb-4 text-sm">
                      Recent Enrollments
                    </h3>
                    <div className="space-y-2">
                      {analytics.recent_activity.map((e) => (
                        <div
                          key={e.id}
                          className="flex items-center justify-between
                            py-2 border-b border-slate-800 last:border-0"
                        >
                          <div>
                            <span className="text-white text-sm">
                              {e.player?.name}
                            </span>
                            <span className="text-slate-500 text-sm mx-2">
                              →
                            </span>
                            <span className="text-slate-300 text-sm">
                              {e.masterclass?.title}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full ${
                                e.status === "active"
                                  ? "bg-emerald-500/20 text-emerald-400"
                                  : "bg-amber-500/20 text-amber-400"
                              }`}
                            >
                              {e.status}
                            </span>
                            <span className="text-slate-600 text-xs">
                              {new Date(e.enrolled_at).toLocaleDateString(
                                "en-IN",
                                {
                                  day: "numeric",
                                  month: "short",
                                },
                              )}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-slate-500 text-sm">Failed to load analytics</p>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════ */}
        {/* TAB: COACHES                                                 */}
        {/* ════════════════════════════════════════════════════════════ */}
        {activeTab === "coaches" && (
          <div>
            <h3 className="text-base font-semibold mb-1">
              Pending Coach Approvals
            </h3>
            <p className="text-slate-400 text-sm mb-5">
              Review and approve new coaches before they can publish classes.
            </p>

            {coachesLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-16 bg-slate-800 rounded-xl animate-pulse"
                  />
                ))}
              </div>
            ) : pending.length === 0 ? (
              <div
                className="bg-slate-900 border border-slate-800
                rounded-2xl p-10 text-center"
              >
                <p className="text-slate-600 text-4xl mb-3">✓</p>
                <p className="text-slate-400 font-medium">
                  No pending approvals
                </p>
                <p className="text-slate-600 text-sm mt-1">
                  All coaches are reviewed
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {pending.map((coach) => (
                  <div
                    key={coach.id}
                    className="bg-slate-900 border border-slate-800
                      rounded-2xl px-5 py-4 flex items-center
                      justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-white">{coach.name}</p>
                      <p className="text-slate-400 text-sm">{coach.email}</p>
                      <p className="text-slate-600 text-xs mt-0.5">
                        Applied{" "}
                        {new Date(coach.created_at).toLocaleDateString(
                          "en-IN",
                          {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          },
                        )}
                      </p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleApprove(coach.id, coach.name)}
                        className="px-4 py-2 rounded-xl text-sm font-medium
                          bg-emerald-500 hover:bg-emerald-400
                          text-slate-950 transition"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleSuspend(coach.id, coach.name)}
                        className="px-4 py-2 rounded-xl text-sm
                          border border-red-500/30 text-red-400
                          hover:border-red-500/60 transition"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════ */}
        {/* TAB: USERS                                                   */}
        {/* ════════════════════════════════════════════════════════════ */}
        {activeTab === "users" && (
          <div>
            <div className="flex items-start justify-between mb-5 gap-4 flex-wrap">
              <div>
                <h3 className="text-base font-semibold mb-1">All Users</h3>
                <p className="text-slate-400 text-sm">
                  {usersResp?.total ?? "—"} total
                </p>
              </div>

              {/* Role filter pills */}
              <div className="flex gap-2 flex-wrap">
                {["", "player", "coach", "admin"].map((r) => (
                  <button
                    key={r}
                    onClick={() => {
                      setUsersRole(r);
                      setUsersPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium
                      border transition capitalize ${
                        usersRole === r
                          ? "bg-slate-700 border-slate-600 text-white"
                          : "border-slate-700 text-slate-500 hover:text-white hover:border-slate-600"
                      }`}
                  >
                    {r || "All roles"}
                  </button>
                ))}
              </div>
            </div>

            {usersLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="h-10 bg-slate-800 rounded animate-pulse"
                  />
                ))}
              </div>
            ) : (usersResp?.data.length ?? 0) === 0 ? (
              <p className="text-slate-600 text-sm py-8 text-center">
                No users found
              </p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[600px]">
                    <thead>
                      <tr
                        className="border-b border-slate-800
                        text-slate-500 text-xs"
                      >
                        <th className="text-left py-2.5 font-medium pr-4">
                          Name
                        </th>
                        <th className="text-left py-2.5 font-medium pr-4">
                          Email
                        </th>
                        <th className="text-left py-2.5 font-medium pr-4">
                          Role
                        </th>
                        <th className="text-left py-2.5 font-medium pr-4">
                          Status
                        </th>
                        <th className="text-left py-2.5 font-medium">Joined</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(usersResp?.data ?? []).map((u) => (
                        <tr
                          key={u.id}
                          className="border-b border-slate-800/50
                            hover:bg-slate-800/30 transition"
                        >
                          <td className="py-3 text-white font-medium pr-4">
                            {u.name}
                          </td>
                          <td className="py-3 text-slate-400 pr-4 text-xs">
                            {u.email}
                          </td>
                          <td className="py-3 pr-4">
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full
                              capitalize font-medium ${ROLE_COLORS[u.role]}`}
                            >
                              {u.role}
                            </span>
                          </td>
                          <td className="py-3 pr-4 text-xs">
                            {u.role === "coach" ? (
                              <span
                                className={
                                  u.is_approved
                                    ? "text-emerald-400"
                                    : "text-amber-400"
                                }
                              >
                                {u.is_approved ? "✓ Approved" : "⏳ Pending"}
                              </span>
                            ) : (
                              <span className="text-slate-600">—</span>
                            )}
                          </td>
                          <td className="py-3 text-slate-500 text-xs">
                            {new Date(u.created_at).toLocaleDateString(
                              "en-IN",
                              {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              },
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <AdminPaginator
                  page={usersResp?.page ?? 1}
                  totalPages={usersResp?.total_pages ?? 1}
                  total={usersResp?.total ?? 0}
                  label="users"
                  onPageChange={(p: number) => setUsersPage(p)}
                />
              </>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════ */}
        {/* TAB: CLASSES                                                 */}
        {/* ════════════════════════════════════════════════════════════ */}
        {activeTab === "classes" && (
          <div>
            <h3 className="text-base font-semibold mb-1">All Masterclasses</h3>
            <p className="text-slate-400 text-sm mb-5">
              {classesResp?.total ?? "—"} total · Force-remove any class
              regardless of enrollments
            </p>

            {classesLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-16 bg-slate-800 rounded-xl animate-pulse"
                  />
                ))}
              </div>
            ) : (classesResp?.data.length ?? 0) === 0 ? (
              <p className="text-slate-600 text-sm py-8 text-center">
                No masterclasses found
              </p>
            ) : (
              <>
                <div className="space-y-2">
                  {(classesResp?.data ?? []).map((mc) => {
                    const edited = wasEdited(mc.created_at, mc.updated_at);
                    const past = new Date(mc.session_date) < new Date();
                    return (
                      <div
                        key={mc.id}
                        className="flex items-start justify-between
                          bg-slate-900 border border-slate-800
                          rounded-xl px-4 py-3 gap-4
                          hover:border-slate-700 transition"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <p className="text-white text-sm font-medium truncate">
                              {mc.title}
                            </p>
                            {edited && (
                              <span
                                className="text-xs px-1.5 py-0.5 rounded
                                  bg-amber-500/15 text-amber-500 flex-shrink-0"
                                title={`Last edited: ${new Date(
                                  mc.updated_at,
                                ).toLocaleString("en-IN")}`}
                              >
                                ✎ edited
                              </span>
                            )}
                            {past && (
                              <span
                                className="text-xs px-1.5 py-0.5 rounded
                                bg-slate-700 text-slate-500 flex-shrink-0"
                              >
                                ended
                              </span>
                            )}
                          </div>

                          <p className="text-slate-500 text-xs">
                            by {mc.coach?.name}
                            {" · "}
                            {new Date(mc.session_date).toLocaleDateString(
                              "en-IN",
                              {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              },
                            )}
                            {" · "}
                            <span className="tabular-nums">
                              {mc.enrolled_count}/{mc.capacity} enrolled
                            </span>
                            {mc.seats_remaining === 0 && (
                              <span className="text-red-400 ml-1">· Full</span>
                            )}
                            {" · "}
                            <span
                              className={`capitalize ${
                                CATEGORY_COLORS[mc.category]
                                  ?.replace("bg-", "text-")
                                  .split(" ")[0] || "text-slate-400"
                              }`}
                            >
                              {mc.category}
                            </span>
                          </p>

                          {edited && (
                            <p className="text-slate-700 text-xs mt-0.5">
                              Updated{" "}
                              {new Date(mc.updated_at).toLocaleDateString(
                                "en-IN",
                                {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )}
                            </p>
                          )}
                        </div>

                        <button
                          onClick={() => handleForceDelete(mc.id, mc.title)}
                          className="flex-shrink-0 self-start text-xs text-red-400
                            hover:text-red-300 border border-red-400/30
                            hover:border-red-400/60 rounded-lg px-2.5 py-1.5
                            transition"
                        >
                          Remove
                        </button>
                      </div>
                    );
                  })}
                </div>

                <AdminPaginator
                  page={classesResp?.page ?? 1}
                  totalPages={classesResp?.total_pages ?? 1}
                  total={classesResp?.total ?? 0}
                  label="classes"
                  onPageChange={(p: number) => setClassesPage(p)}
                />
              </>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════ */}
        {/* TAB: REVIEWS                                                 */}
        {/* ════════════════════════════════════════════════════════════ */}
        {activeTab === "reviews" && (
          <div>
            <h3 className="text-base font-semibold mb-1">Review Moderation</h3>
            <p className="text-slate-400 text-sm mb-5">
              {reviews.length} review{reviews.length !== 1 ? "s" : ""}{" "}
              platform-wide
            </p>

            {reviewsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="bg-slate-800 rounded-xl h-20 animate-pulse"
                  />
                ))}
              </div>
            ) : reviews.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-600 text-4xl mb-3">★</p>
                <p className="text-slate-400 font-medium">No reviews yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {reviews.map((r) => (
                  <div
                    key={r.id}
                    className="bg-slate-900 border border-slate-800
                      rounded-xl p-4 flex justify-between
                      items-start gap-4 hover:border-slate-700 transition"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-amber-400 text-sm">
                          {"★".repeat(r.rating)}
                          <span className="text-slate-700">
                            {"★".repeat(5 - r.rating)}
                          </span>
                        </span>
                        <span className="text-slate-500 text-xs">
                          by{" "}
                          <span className="text-slate-300">{r.player_name}</span>
                          {" on "}
                          <span className="text-slate-300">
                            {r.masterclass_title}
                          </span>
                        </span>
                      </div>

                      {r.comment && (
                        <p
                          className="text-slate-300 text-sm leading-relaxed
                          truncate max-w-xl"
                        >
                          "{r.comment}"
                        </p>
                      )}

                      <p className="text-slate-600 text-xs mt-1.5">
                        Coach: {r.coach_name}
                        {" · "}
                        {new Date(r.created_at).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>

                    <button
                      onClick={() => handleDeleteReview(r.id)}
                      className="flex-shrink-0 text-xs text-red-400
                        hover:text-red-300 border border-red-400/30
                        hover:border-red-400/60 rounded-lg px-2.5 py-1.5
                        transition"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════ */}
        {/* TAB: KICK REQUESTS                                           */}
        {/* ════════════════════════════════════════════════════════════ */}
        {activeTab === "kick_requests" && (
          <div>
            <h3 className="text-base font-semibold mb-1">Kick Requests</h3>
            <p className="text-slate-400 text-sm mb-5">
              Review requests from coaches to remove students from their classes.
            </p>

            {kickReqLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="bg-slate-800 rounded-xl h-24 animate-pulse"
                  />
                ))}
              </div>
            ) : kickRequests.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-600 text-4xl mb-3">✅</p>
                <p className="text-slate-400 font-medium">
                  No pending kick requests
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {kickRequests.map((req) => (
                  <div
                    key={req.id}
                    className={`bg-slate-900 border rounded-xl p-5 ${
                      req.status === "pending"
                        ? "border-amber-500/30"
                        : "border-slate-800 opacity-60"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full capitalize font-medium ${
                              req.status === "pending"
                                ? "bg-amber-500/20 text-amber-400"
                                : req.status === "approved"
                                  ? "bg-emerald-500/20 text-emerald-400"
                                  : "bg-red-500/20 text-red-400"
                            }`}
                          >
                            {req.status}
                          </span>
                          <span className="text-slate-500 text-xs">
                            {new Date(req.created_at).toLocaleDateString(
                              "en-IN",
                              {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              },
                            )}
                          </span>
                        </div>
                        <p className="text-white font-medium text-sm">
                          Coach{" "}
                          <span className="text-amber-400">{req.coach.name}</span>{" "}
                          wants to remove{" "}
                          <span className="text-emerald-400">
                            {req.player.name}
                          </span>
                        </p>
                        <p className="text-slate-400 text-xs mt-1">
                          Class:{" "}
                          <span className="text-slate-300">
                            {req.masterclass.title}
                          </span>
                        </p>
                      </div>

                      {req.status === "pending" && (
                        <div className="flex gap-2 flex-shrink-0">
                          <button
                            onClick={() =>
                              handleResolveKick(req.id, "approve")
                            }
                            className="px-3 py-1.5 bg-emerald-500/10
                              hover:bg-emerald-500/20 text-emerald-400
                              border border-emerald-500/30 rounded-lg
                              text-xs font-medium transition"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() =>
                              handleResolveKick(req.id, "reject")
                            }
                            className="px-3 py-1.5 bg-slate-800
                              hover:bg-slate-700 text-slate-300
                              border border-slate-700 rounded-lg
                              text-xs font-medium transition"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="bg-slate-950 rounded-lg p-3 border border-slate-800">
                      <p className="text-xs text-slate-500 mb-1 uppercase tracking-wider font-semibold">
                        Reason provided
                      </p>
                      <p className="text-sm text-slate-300 whitespace-pre-line">
                        {req.reason}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
