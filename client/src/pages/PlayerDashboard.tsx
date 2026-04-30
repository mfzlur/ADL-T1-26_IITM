import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../hooks/useAuth";
import api from "../utils/api";
import ReviewModal from "../components/ReviewModal";
import NotificationBell from "../components/NotificationBell";

// ── Types ──────────────────────────────────────────────────────────────────────
interface EnrolledMasterclass {
  id: string;
  title: string;
  description: string;
  session_date: string;
  category: string;
  capacity: number;
  coach: { id: string; name: string };
}

interface ActiveEnrollment {
  id: string;
  masterclass_id: string;
  enrolled_at: string;
  status: "active";
  masterclass: EnrolledMasterclass;
}

interface WaitlistedEnrollment {
  id: string;
  masterclass_id: string;
  enrolled_at: string;
  status: "waitlisted";
  waitlist_position?: number;
  masterclass: EnrolledMasterclass;
}

interface Enrollments {
  active: ActiveEnrollment[];
  waitlisted: WaitlistedEnrollment[];
}

type Tab = "classes" | "bookmarks" | "profile";

// Profile form shape
interface ProfileForm {
  bio: string;
  chess_rating: string;
  experience_level: string;
}

// Tracks which masterclasses the player has already reviewed
// (populated on successful review submission this session)
interface ReviewState {
  hasReview: boolean;
  existingRating?: number;
  existingComment?: string;
}

interface Bookmark {
  id: string;
  masterclass?: {
    id: string;
    title: string;
    category: string;
    session_date: string;
    coach?: { name: string };
  };
}

// ── Category colours ───────────────────────────────────────────────────────────
const CATEGORY_COLORS: Record<string, string> = {
  opening: "bg-blue-500/20 text-blue-400",
  middlegame: "bg-purple-500/20 text-purple-400",
  endgame: "bg-amber-500/20 text-amber-400",
  tactics: "bg-red-500/20 text-red-400",
};

const LEVEL_LABELS: Record<string, string> = {
  beginner: "🌱 Beginner",
  intermediate: "⚡ Intermediate",
  advanced: "♟ Advanced",
};

// ── Component ──────────────────────────────────────────────────────────────────
export default function PlayerDashboard() {
  const { user, logout } = useAuth();

  // ── Core state ───────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<Tab>("classes");
  const [enrollments, setEnrollments] = useState<Enrollments>({
    active: [],
    waitlisted: [],
  });
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState("");

  // Review tracking
  const [reviewMap, setReviewMap] = useState<Record<string, ReviewState>>({});
  const [reviewTarget, setReviewTarget] = useState<{
    id: string;
    title: string;
    mode: "create" | "edit";
    initialRating?: number;
    initialComment?: string;
  } | null>(null);

  // Profile editing
  const [profileForm, setProfileForm] = useState<ProfileForm>({
    bio: "",
    chess_rating: "",
    experience_level: "",
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState("");
  const [profileError, setProfileError] = useState("");
  const [profileEditing, setProfileEditing] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);

  // Bookmarks

  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);

  const [bookmarksLoading, setBookmarksLoading] = useState(false);

  // ── Fetch enrollments ────────────────────────────────────────────────────────
  const fetchEnrollments = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<Enrollments>("/enrollments/my");
      setEnrollments(data);
    } catch {
      // silently fail — user will see empty state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await fetchEnrollments();
    })();
  }, [fetchEnrollments]);

  // Fetch bookmarks when tab is selected

  useEffect(() => {
    if (activeTab !== "bookmarks") return;
    void (async () => {
      setBookmarksLoading(true);
      try {
        const r = await api.get("/bookmarks");
        setBookmarks(r.data as Bookmark[]);
      } finally {
        setBookmarksLoading(false);
      }
    })();
  }, [activeTab]);

  // ── Cancel enrollment ────────────────────────────────────────────────────────
  const handleCancel = async (masterclassId: string, title: string) => {
    if (!confirm(`Cancel enrollment in "${title}"?`)) return;
    try {
      const { data } = await api.delete(`/enrollments/${masterclassId}`);
      setActionMsg(data.message);
      await fetchEnrollments();
    } catch (err: unknown) {
      const r = (err as { response?: { data?: { message?: string } } })
        .response;
      setActionMsg(r?.data?.message ?? "Failed to cancel enrollment");
    }
  };

  // ── Open review modal ────────────────────────────────────────────────────────
  const openReview = (mc: EnrolledMasterclass) => {
    const existing = reviewMap[mc.id];
    if (existing?.hasReview) {
      setReviewTarget({
        id: mc.id,
        title: mc.title,
        mode: "edit",
        initialRating: existing.existingRating,
        initialComment: existing.existingComment,
      });
    } else {
      setReviewTarget({ id: mc.id, title: mc.title, mode: "create" });
    }
  };

  const handleReviewSubmitted = (
    masterclassId: string,
    rating: number,
    comment: string,
  ) => {
    // Track locally so button switches to "Edit Review" for this session
    setReviewMap((prev) => ({
      ...prev,
      [masterclassId]: {
        hasReview: true,
        existingRating: rating,
        existingComment: comment,
      },
    }));
    setActionMsg("Review submitted successfully!");
  };

  // ── Fetch profile on tab switch ───────────────────────────────────────────────
  useEffect(() => {
    if (activeTab !== "profile" || profileLoaded) return;
    api
      .get("/profile/me")
      .then((r) => {
        const d = r.data;
        setProfileForm({
          bio: d.bio || "",
          chess_rating: d.chess_rating || "",
          experience_level: d.experience_level || "",
        });
        setProfileLoaded(true);
      })
      .catch(() => {});
  }, [activeTab, profileLoaded]);

  // ── Profile save ──────────────────────────────────────────────────────────────
  const handleProfileSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setProfileMsg("");
    setProfileError("");
    setProfileSaving(true);
    try {
      await api.patch("/profile/me", {
        bio: profileForm.bio.trim() || null,
        chess_rating: profileForm.chess_rating.trim() || null,
        experience_level: profileForm.experience_level || null,
      });
      setProfileMsg("Profile updated successfully!");
    } catch (err: unknown) {
      const r = (err as { response?: { data?: { message?: string } } })
        .response;
      setProfileError(r?.data?.message ?? "Failed to update profile");
    } finally {
      setProfileSaving(false);
    }
  };

  // ── Derived ───────────────────────────────────────────────────────────────────
  const isPast = (dateStr: string) => new Date(dateStr) < new Date();

  const upcomingEnrollments = enrollments.active.filter(
    (e) => !isPast(e.masterclass.session_date),
  );
  const pastEnrollments = enrollments.active.filter((e) =>
    isPast(e.masterclass.session_date),
  );

  const totalClasses =
    enrollments.active.length + enrollments.waitlisted.length;

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* ── Header ── */}
      <header
        className="bg-slate-900 border-b border-slate-800 px-6 py-4
        flex justify-between items-center sticky top-0 z-10"
      >
        <div className="flex items-center gap-3">
          <a
            href="/"
            className="flex items-center gap-2 hover:opacity-80 transition"
          >
            <span className="text-2xl">♟</span>
            <span className="font-bold text-lg">Chess Arena</span>
          </a>
        </div>

        <nav className="flex items-center gap-6">
          <a
            href="/browse"
            className="text-sm text-slate-400 hover:text-white transition
              flex items-center gap-1.5"
          >
            🔍 Browse Classes
          </a>

          <NotificationBell />

          {/* User pill */}
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-full bg-emerald-500/20
              flex items-center justify-center text-emerald-400
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
        </nav>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* ── Page heading + stats ── */}
        <div
          className="flex flex-col sm:flex-row sm:items-end
          justify-between gap-4 mb-8"
        >
          <div>
            <h1 className="text-2xl font-bold">My Dashboard</h1>
            <p className="text-slate-400 text-sm mt-1">
              Welcome back, {user?.name}
            </p>
          </div>

          {/* Quick stats */}
          <div className="flex gap-3">
            <div
              className="bg-slate-900 border border-slate-800
              rounded-xl px-4 py-2.5 text-center min-w-[80px]"
            >
              <p className="text-xl font-bold text-emerald-400">
                {enrollments.active.length}
              </p>
              <p className="text-slate-500 text-xs mt-0.5">Enrolled</p>
            </div>
            <div
              className="bg-slate-900 border border-slate-800
              rounded-xl px-4 py-2.5 text-center min-w-[80px]"
            >
              <p className="text-xl font-bold text-amber-400">
                {enrollments.waitlisted.length}
              </p>
              <p className="text-slate-500 text-xs mt-0.5">Waitlisted</p>
            </div>
          </div>
        </div>

        {/* ── Action message ── */}
        {actionMsg && (
          <div
            className="bg-emerald-500/10 border border-emerald-500/30
            text-emerald-400 rounded-xl px-4 py-3 mb-6 text-sm
            flex justify-between items-center"
          >
            <span>{actionMsg}</span>
            <button
              onClick={() => setActionMsg("")}
              className="text-emerald-600 hover:text-emerald-400 transition ml-4"
            >
              ✕
            </button>
          </div>
        )}

        {/* ── Tabs ── */}
        <div
          className="flex gap-1 bg-slate-900 border border-slate-800
          rounded-xl p-1 w-fit mb-6"
        >
          {(
            [
              { id: "classes", label: "📋 My Classes", count: totalClasses },
              { id: "bookmarks", label: "🔖 Saved" },
              { id: "profile", label: "👤 Profile" },
            ] as { id: Tab; label: string; count?: number }[]
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm
                font-medium transition ${
                  activeTab === tab.id
                    ? "bg-slate-800 text-white"
                    : "text-slate-500 hover:text-slate-300"
                }`}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span
                  className={`text-xs px-1.5 py-0.5 rounded-full ${
                    activeTab === tab.id
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-slate-800 text-slate-500"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ════════════════════════════════════════════════════════════ */}
        {/* TAB: MY CLASSES                                              */}
        {/* ════════════════════════════════════════════════════════════ */}
        {activeTab === "classes" && (
          <div className="space-y-8">
            {/* ── Loading skeleton ── */}
            {loading && (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="bg-slate-900 border border-slate-800
                      rounded-2xl p-5 animate-pulse"
                  >
                    <div className="h-4 bg-slate-800 rounded w-1/3 mb-3" />
                    <div className="h-5 bg-slate-800 rounded w-2/3 mb-2" />
                    <div className="h-4 bg-slate-800 rounded w-1/4" />
                  </div>
                ))}
              </div>
            )}

            {!loading && (
              <>
                {/* ── Upcoming enrollments ── */}
                <section>
                  <h2
                    className="text-base font-semibold text-slate-300 mb-3
                    flex items-center gap-2"
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Upcoming Classes
                    <span className="text-slate-600 font-normal text-sm">
                      ({upcomingEnrollments.length})
                    </span>
                  </h2>

                  {upcomingEnrollments.length === 0 ? (
                    <div
                      className="bg-slate-900 border border-slate-800
                      rounded-2xl p-10 text-center"
                    >
                      <p className="text-slate-600 text-4xl mb-3">♜</p>
                      <p className="text-slate-400 font-medium mb-1">
                        No upcoming classes
                      </p>
                      <p className="text-slate-600 text-sm mb-4">
                        Find a masterclass to get started
                      </p>
                      <a
                        href="/browse"
                        className="inline-block bg-emerald-500 hover:bg-emerald-400
                          text-slate-950 font-medium text-sm px-5 py-2.5
                          rounded-xl transition"
                      >
                        Browse Classes
                      </a>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {upcomingEnrollments.map((e) => {
                        const past = false; // these are all upcoming
                        const alreadyRevd =
                          reviewMap[e.masterclass.id]?.hasReview;

                        return (
                          <div
                            key={e.id}
                            className="bg-slate-900 border border-slate-800
                              rounded-2xl p-5 hover:border-slate-700 transition"
                          >
                            <div
                              className="flex flex-col sm:flex-row
                              sm:items-start justify-between gap-4"
                            >
                              {/* Info */}
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 mb-1.5">
                                  <span
                                    className={`text-xs px-2 py-0.5 rounded-full
                                    capitalize font-medium
                                    ${CATEGORY_COLORS[e.masterclass.category]}`}
                                  >
                                    {e.masterclass.category}
                                  </span>
                                  {past && (
                                    <span
                                      className="text-xs px-2 py-0.5 rounded-full
                                      bg-slate-700 text-slate-400"
                                    >
                                      Ended
                                    </span>
                                  )}
                                </div>

                                <h3
                                  className="font-semibold text-white
                                  leading-snug mb-1"
                                >
                                  <a
                                    href={`/class/${e.masterclass.id}`}
                                    className="hover:text-emerald-400 transition"
                                  >
                                    {e.masterclass.title}
                                  </a>
                                </h3>

                                <p className="text-slate-400 text-sm">
                                  by {e.masterclass.coach?.name}
                                </p>

                                <p
                                  className={`text-xs mt-1 ${
                                    past ? "text-slate-600" : "text-slate-500"
                                  }`}
                                >
                                  📅{" "}
                                  {new Date(
                                    e.masterclass.session_date,
                                  ).toLocaleString("en-IN", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </p>

                                <p className="text-slate-700 text-xs mt-1">
                                  Enrolled{" "}
                                  {new Date(e.enrolled_at).toLocaleDateString(
                                    "en-IN",
                                    {
                                      day: "numeric",
                                      month: "short",
                                      year: "numeric",
                                    },
                                  )}
                                </p>
                              </div>

                              {/* Actions */}
                              <div className="flex gap-2 flex-shrink-0">
                                {/* Review button — only for past sessions */}
                                {past && (
                                  <button
                                    onClick={() => openReview(e.masterclass)}
                                    className={`px-3 py-2 rounded-xl text-sm
                                      font-medium transition border ${
                                        alreadyRevd
                                          ? "border-amber-500/40 text-amber-400 hover:border-amber-500/70"
                                          : "border-slate-700 text-slate-400 hover:text-amber-400 hover:border-amber-500/40"
                                      }`}
                                  >
                                    {alreadyRevd ? "✎ Edit Review" : "★ Review"}
                                  </button>
                                )}

                                {/* Cancel — only for future sessions */}
                                {!past && (
                                  <button
                                    onClick={() =>
                                      handleCancel(
                                        e.masterclass.id,
                                        e.masterclass.title,
                                      )
                                    }
                                    className="px-3 py-2 rounded-xl text-sm
                                      border border-red-500/30 text-red-400
                                      hover:border-red-500/60 hover:text-red-300
                                      transition"
                                  >
                                    Cancel
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>

                {/* ── Past Classes ── */}
                <section>
                  <h2
                    className="text-base font-semibold text-slate-300 mb-3
                    flex items-center gap-2"
                  >
                    <span className="w-2 h-2 rounded-full bg-slate-500" />
                    Past Classes
                    <span className="text-slate-600 font-normal text-sm">
                      ({pastEnrollments.length})
                    </span>
                  </h2>

                  {pastEnrollments.length === 0 ? (
                    <p className="text-slate-600 text-sm py-4 pl-1">
                      No past classes yet.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {pastEnrollments.map((e) => {
                        const alreadyRevd =
                          reviewMap[e.masterclass.id]?.hasReview;
                        return (
                          <div
                            key={e.id}
                            className="bg-slate-900/50 border border-slate-800/50
                            rounded-xl p-4 hover:border-slate-700 transition"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span
                                    className={`text-xs px-2 py-0.5 rounded-full
                                    capitalize font-medium ${CATEGORY_COLORS[e.masterclass.category]}`}
                                  >
                                    {e.masterclass.category}
                                  </span>
                                  <span
                                    className="text-xs px-2 py-0.5 rounded-full
                                    bg-slate-700 text-slate-400"
                                  >
                                    Ended
                                  </span>
                                </div>
                                <h3 className="font-medium text-slate-300 text-sm">
                                  <a
                                    href={`/class/${e.masterclass.id}`}
                                    className="hover:text-emerald-400 transition"
                                  >
                                    {e.masterclass.title}
                                  </a>
                                </h3>
                                <p className="text-slate-500 text-xs mt-0.5">
                                  by {e.masterclass.coach?.name} ·{" "}
                                  {new Date(
                                    e.masterclass.session_date,
                                  ).toLocaleDateString("en-IN", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  })}
                                </p>
                              </div>
                              <button
                                onClick={() => openReview(e.masterclass)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium
                                transition border flex-shrink-0 ${
                                  alreadyRevd
                                    ? "border-amber-500/40 text-amber-400 hover:border-amber-500/70"
                                    : "border-slate-700 text-slate-400 hover:text-amber-400 hover:border-amber-500/40"
                                }`}
                              >
                                {alreadyRevd ? "✎ Edit Review" : "★ Review"}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>

                {/* ── Waitlisted enrollments ── */}
                <section>
                  <h2
                    className="text-base font-semibold text-slate-300 mb-3
                    flex items-center gap-2"
                  >
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    Waitlisted
                    <span className="text-slate-600 font-normal text-sm">
                      ({enrollments.waitlisted.length})
                    </span>
                  </h2>

                  {enrollments.waitlisted.length === 0 ? (
                    <p className="text-slate-600 text-sm py-4 pl-1">
                      No waitlisted classes.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {enrollments.waitlisted.map((e) => (
                        <div
                          key={e.id}
                          className="bg-slate-900 border border-amber-500/20
                            rounded-2xl p-5 hover:border-amber-500/40 transition"
                        >
                          <div
                            className="flex flex-col sm:flex-row
                            sm:items-start justify-between gap-4"
                          >
                            {/* Info */}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-1.5">
                                <span
                                  className={`text-xs px-2 py-0.5 rounded-full
                                  capitalize font-medium
                                  ${CATEGORY_COLORS[e.masterclass.category]}`}
                                >
                                  {e.masterclass.category}
                                </span>
                                {/* Waitlist position badge */}
                                {e.waitlist_position != null && (
                                  <span
                                    className="text-xs px-2 py-0.5 rounded-full
                                    bg-amber-500/20 text-amber-400 font-medium"
                                  >
                                    #{e.waitlist_position} in queue
                                  </span>
                                )}
                              </div>

                              <h3
                                className="font-semibold text-white
                                leading-snug mb-1"
                              >
                                <a
                                  href={`/class/${e.masterclass.id}`}
                                  className="hover:text-emerald-400 transition"
                                >
                                  {e.masterclass.title}
                                </a>
                              </h3>

                              <p className="text-slate-400 text-sm">
                                ⏳ Waiting for a seat · by{" "}
                                {e.masterclass.coach?.name}
                              </p>

                              <p className="text-slate-500 text-xs mt-1">
                                📅{" "}
                                {new Date(
                                  e.masterclass.session_date,
                                ).toLocaleString("en-IN", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </p>

                              <p className="text-slate-700 text-xs mt-1">
                                Waitlisted on{" "}
                                {new Date(e.enrolled_at).toLocaleDateString(
                                  "en-IN",
                                  {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  },
                                )}
                              </p>
                            </div>

                            {/* Cancel */}
                            <button
                              onClick={() =>
                                handleCancel(
                                  e.masterclass.id,
                                  e.masterclass.title,
                                )
                              }
                              className="flex-shrink-0 px-3 py-2 rounded-xl text-sm
                                border border-red-500/30 text-red-400
                                hover:border-red-500/60 hover:text-red-300
                                transition self-start"
                            >
                              Leave waitlist
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════ */}
        {/* TAB: BOOKMARKS                                               */}
        {/* ════════════════════════════════════════════════════════════ */}
        {activeTab === "bookmarks" && (
          <div>
            <h2 className="text-base font-semibold text-slate-300 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              Saved Classes
            </h2>

            {bookmarksLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="bg-slate-900 border border-slate-800 rounded-2xl p-5 animate-pulse"
                  >
                    <div className="h-4 bg-slate-800 rounded w-1/3 mb-3" />
                    <div className="h-5 bg-slate-800 rounded w-2/3" />
                  </div>
                ))}
              </div>
            ) : bookmarks.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center">
                <p className="text-slate-600 text-4xl mb-3">🔖</p>
                <p className="text-slate-400 font-medium mb-1">
                  No saved classes
                </p>
                <p className="text-slate-600 text-sm mb-4">
                  Bookmark masterclasses from the browse page to save them here
                </p>
                <a
                  href="/browse"
                  className="inline-block bg-emerald-500 hover:bg-emerald-400
                  text-slate-950 font-medium text-sm px-5 py-2.5 rounded-xl transition"
                >
                  Browse Classes
                </a>
              </div>
            ) : (
              <div className="space-y-3">
                {bookmarks.map((b) => (
                  <a
                    key={b.id}
                    href={`/class/${b.masterclass?.id}`}
                    className="block bg-slate-900 border border-slate-800 rounded-2xl p-5
                    hover:border-slate-700 transition"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full capitalize
                          font-medium inline-block mb-1.5 ${
                            (
                              {
                                opening: "bg-blue-500/20 text-blue-400",
                                middlegame: "bg-purple-500/20 text-purple-400",
                                endgame: "bg-amber-500/20 text-amber-400",
                                tactics: "bg-red-500/20 text-red-400",
                              } as Record<string, string>
                            )[b.masterclass?.category ?? ""] ??
                            "bg-slate-700 text-slate-400"
                          }`}
                        >
                          {b.masterclass?.category}
                        </span>
                        <h3 className="font-semibold text-white mb-1">
                          {b.masterclass?.title}
                        </h3>
                        <p className="text-slate-400 text-sm">
                          by {b.masterclass?.coach?.name}
                        </p>
                        <p className="text-slate-500 text-xs mt-1">
                          📅{" "}
                          {b.masterclass?.session_date
                            ? new Date(
                                b.masterclass.session_date,
                              ).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })
                            : "—"}
                        </p>
                      </div>
                      <span className="text-amber-400 text-lg flex-shrink-0">
                        🔖
                      </span>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════ */}
        {/* TAB: PROFILE                                                 */}
        {/* ════════════════════════════════════════════════════════════ */}
        {activeTab === "profile" && (
          <div className="max-w-lg">
            {/* Identity block (read-only) */}
            <div
              className="flex items-center gap-4 mb-8 p-5
              bg-slate-900 border border-slate-800 rounded-2xl"
            >
              <div
                className="w-14 h-14 rounded-full bg-emerald-500/20
                flex items-center justify-center text-emerald-400
                font-bold text-2xl flex-shrink-0"
              >
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-white text-lg">{user?.name}</p>
                <p className="text-slate-400 text-sm">{user?.email}</p>
                <span
                  className="text-xs px-2 py-0.5 rounded-full mt-1 inline-block
                  bg-emerald-500/20 text-emerald-400 capitalize"
                >
                  {user?.role}
                </span>
              </div>
              {!profileEditing && (
                <button
                  onClick={() => setProfileEditing(true)}
                  className="text-xs px-3 py-1.5 border border-slate-700
                  hover:border-emerald-500 text-slate-400 hover:text-emerald-400
                  rounded-lg transition"
                >
                  ✏️ Edit Profile
                </button>
              )}
            </div>

            {/* Feedback */}
            {profileMsg && (
              <div
                className="bg-emerald-500/10 border border-emerald-500/30
                text-emerald-400 rounded-xl px-4 py-3 mb-5 text-sm
                flex justify-between items-center"
              >
                <span>{profileMsg}</span>
                <button
                  onClick={() => setProfileMsg("")}
                  className="text-emerald-600 hover:text-emerald-400 transition ml-4"
                >
                  ✕
                </button>
              </div>
            )}
            {profileError && (
              <div
                className="bg-red-500/10 border border-red-500/30
                text-red-400 rounded-xl px-4 py-3 mb-5 text-sm"
              >
                {profileError}
              </div>
            )}

            {/* ── Read-only view ── */}
            {!profileEditing && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                <h3 className="text-base font-semibold mb-1">Chess Profile</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Chess Rating</p>
                    <p className="text-sm text-white font-medium">
                      {profileForm.chess_rating || (
                        <span className="text-slate-600 italic">Not set</span>
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">
                      Experience Level
                    </p>
                    <p className="text-sm text-white font-medium capitalize">
                      {profileForm.experience_level ? (
                        LEVEL_LABELS[profileForm.experience_level] ||
                        profileForm.experience_level
                      ) : (
                        <span className="text-slate-600 italic">Not set</span>
                      )}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">About you</p>
                  <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                    {profileForm.bio || (
                      <span className="text-slate-600 italic">
                        No bio added yet
                      </span>
                    )}
                  </p>
                </div>
              </div>
            )}

            {/* ── Edit form ── */}
            {profileEditing && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-semibold">
                    Edit Chess Profile
                  </h3>
                  <button
                    onClick={() => setProfileEditing(false)}
                    className="text-xs text-slate-500 hover:text-slate-300 transition"
                  >
                    Cancel
                  </button>
                </div>
                <form
                  onSubmit={async (e) => {
                    await handleProfileSave(e);
                    setProfileEditing(false);
                  }}
                  className="space-y-5"
                >
                  {/* Chess rating */}
                  <div>
                    <label className="text-sm text-slate-400 block mb-2">
                      Chess Rating
                      <span className="text-slate-600 ml-1.5 text-xs">
                        (e.g. 1450, ~1600, Unrated)
                      </span>
                    </label>
                    <input
                      type="text"
                      value={profileForm.chess_rating}
                      onChange={(e) =>
                        setProfileForm((f) => ({
                          ...f,
                          chess_rating: e.target.value,
                        }))
                      }
                      placeholder="e.g. 1450"
                      maxLength={20}
                      className="w-full bg-slate-800 border border-slate-700 text-white
                      rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 transition"
                    />
                  </div>
                  {/* Experience level */}
                  <div>
                    <label className="text-sm text-slate-400 block mb-2">
                      Experience Level
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(["beginner", "intermediate", "advanced"] as const).map(
                        (level) => (
                          <button
                            key={level}
                            type="button"
                            onClick={() =>
                              setProfileForm((f) => ({
                                ...f,
                                experience_level:
                                  f.experience_level === level ? "" : level,
                              }))
                            }
                            className={`py-2.5 px-3 rounded-xl text-sm font-medium
                        border transition capitalize ${
                          profileForm.experience_level === level
                            ? "bg-emerald-500/20 border-emerald-500/60 text-emerald-400"
                            : "border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white"
                        }`}
                          >
                            {LEVEL_LABELS[level]}
                          </button>
                        ),
                      )}
                    </div>
                  </div>
                  {/* Bio */}
                  <div>
                    <label className="text-sm text-slate-400 block mb-2">
                      About you{" "}
                      <span className="text-slate-600 ml-1.5 text-xs">
                        (visible to your coaches)
                      </span>
                    </label>
                    <textarea
                      value={profileForm.bio}
                      onChange={(e) =>
                        setProfileForm((f) => ({ ...f, bio: e.target.value }))
                      }
                      placeholder="Tell your coaches about your chess journey, goals, and what you want to improve..."
                      maxLength={1000}
                      rows={5}
                      className="w-full bg-slate-800 border border-slate-700 text-white
                      rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition resize-none"
                    />
                    <p className="text-slate-700 text-xs mt-1 text-right">
                      {profileForm.bio.length}/1000
                    </p>
                  </div>
                  <button
                    type="submit"
                    disabled={profileSaving}
                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-950
                    font-medium text-sm px-6 py-2.5 rounded-xl transition
                    disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {profileSaving ? "Saving..." : "Save Profile"}
                  </button>
                </form>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Review Modal ── */}
      {reviewTarget && (
        <ReviewModal
          masterclassId={reviewTarget.id}
          masterclassTitle={reviewTarget.title}
          mode={reviewTarget.mode}
          initialRating={reviewTarget.initialRating}
          initialComment={reviewTarget.initialComment}
          onClose={() => setReviewTarget(null)}
          onSubmitted={(rating, comment) => {
            handleReviewSubmitted(reviewTarget.id, rating, comment);
            setReviewTarget(null);
          }}
        />
      )}
    </div>
  );
}
