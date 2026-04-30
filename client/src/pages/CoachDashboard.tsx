import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../hooks/useAuth";
import api from "../utils/api";
import NotificationBell from "../components/NotificationBell";

interface Masterclass {
  id: string;
  title: string;
  category: string;
  session_date: string;
  capacity: number;
  enrolled_count: number;
  seats_remaining: number;
  waitlist_count: number;
  description: string;
  media_url?: string;
  video_url?: string;
}

interface EnrolledPlayer {
  id: string;
  player_id: string;
  player_name: string;
  email: string;
  enrolled_at: string;
  status: string;
}

interface MaterialItem {
  id: number;
  type: string;
  title: string;
  description: string | null;
  url: string;
}

interface StudentProfile {
  name: string;
  email: string;
  masterclass_id: string;
  player_id: string;
  chess_rating?: number | string;
  experience_level?: string;
  bio?: string;
  created_at?: string;
  shared_classes?: unknown[];
}

// Shape of raw enrollment items from /masterclasses/:id/enrollments
interface RawEnrollmentItem {
  id: string;
  player_id: string;
  player?: { name: string; email: string };
  enrolled_at: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  opening: "bg-blue-500/20 text-blue-400",
  middlegame: "bg-purple-500/20 text-purple-400",
  endgame: "bg-amber-500/20 text-amber-400",
  tactics: "bg-red-500/20 text-red-400",
};

const emptyForm = {
  title: "",
  description: "",
  session_date: "",
  category: "opening",
  capacity: 20,
  video_url: "",
};

// Error message extractor
const getErrMsg = (err: unknown, fallback: string): string => {
  if (err && typeof err === "object" && "response" in err) {
    const r = (err as { response?: { data?: { message?: string } } }).response;
    return r?.data?.message ?? fallback;
  }
  return fallback;
};

export default function CoachDashboard() {
  const { user, logout } = useAuth();

  const [classes, setClasses] = useState<Masterclass[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Masterclass | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [enrolledMap, setEnrolledMap] = useState<
    Record<string, EnrolledPlayer[]>
  >({});
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Materials state
  const [materialsMap, setMaterialsMap] = useState<
    Record<string, MaterialItem[]>
  >({});
  const [matForm, setMatForm] = useState({
    type: "link",
    title: "",
    url: "",
    description: "",
  });
  const [addingMat, setAddingMat] = useState<string | null>(null);
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(
    null,
  );
  const [kickReason, setKickReason] = useState("");
  const [showKickForm, setShowKickForm] = useState(false);
  const [submittingKick, setSubmittingKick] = useState(false);

  const [form, setForm] = useState(emptyForm);

  // ── Edit form state (separate from create) ──────────────────────────
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    session_date: "",
    category: "opening",
    capacity: 20,
    video_url: "",
  });

  const showMessage = (msg: string, error = false) => {
    setMessage(msg);
    setIsError(error);
    setTimeout(() => setMessage(""), 4000);
  };

  // ── fetchMyClasses declared BEFORE useEffect ─────────────────────────
  const fetchMyClasses = useCallback(async () => {
    try {
      const { data } = await api.get("/masterclasses/mine");
      setClasses(data);
    } catch {
      showMessage("Failed to load classes", true);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await fetchMyClasses();
    })();
  }, [fetchMyClasses]);

  // ── Load enrolled students for a class ──────────────────────────────
  const fetchEnrolled = async (classId: string) => {
    if (enrolledMap[classId]) return;
    try {
      const { data } = await api.get(`/masterclasses/${classId}/enrollments`);
      const students: EnrolledPlayer[] = [
        ...(data.active ?? []).map((e: RawEnrollmentItem) => ({
          id: e.id,
          player_id: e.player_id,
          player_name: e.player?.name ?? "",
          email: e.player?.email ?? "",
          enrolled_at: e.enrolled_at,
          status: "active",
        })),
        ...(data.waitlisted ?? []).map((e: RawEnrollmentItem) => ({
          id: e.id,
          player_id: e.player_id,
          player_name: e.player?.name ?? "",
          email: e.player?.email ?? "",
          enrolled_at: e.enrolled_at,
          status: "waitlisted",
        })),
      ];
      setEnrolledMap((prev) => ({ ...prev, [classId]: students }));
    } catch {
      setEnrolledMap((prev) => ({ ...prev, [classId]: [] }));
    }
  };

  const fetchMaterials = async (classId: string) => {
    if (materialsMap[classId]) return;
    try {
      const { data } = await api.get(`/materials/${classId}`);
      setMaterialsMap((prev) => ({
        ...prev,
        [classId]: data as MaterialItem[],
      }));
    } catch {
      setMaterialsMap((prev) => ({ ...prev, [classId]: [] }));
    }
  };

  const toggleExpand = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      void fetchEnrolled(id);
      void fetchMaterials(id);
    }
  };

  // ── CREATE ───────────────────────────────────────────────────────────
  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, String(v)));
      if (mediaFile) fd.append("media", mediaFile);

      await api.post("/masterclasses", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      showMessage("Masterclass created successfully!");
      setShowForm(false);
      setForm(emptyForm);
      setMediaFile(null);
      void fetchMyClasses();
    } catch (err: unknown) {
      showMessage(getErrMsg(err, "Error creating class"), true);
    } finally {
      setSubmitting(false);
    }
  };

  // ── EDIT — open form ─────────────────────────────────────────────────
  const openEdit = (mc: Masterclass) => {
    setEditTarget(mc);
    setEditForm({
      title: mc.title,
      description: mc.description,
      session_date: mc.session_date.slice(0, 16),
      category: mc.category,
      capacity: mc.capacity,
      video_url: mc.video_url || "",
    });
  };

  // ── EDIT — submit ────────────────────────────────────────────────────
  const handleEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editTarget) return;
    setSubmitting(true);
    try {
      await api.put(`/masterclasses/${editTarget.id}`, editForm);
      showMessage("Masterclass updated!");
      setEditTarget(null);
      void fetchMyClasses();
    } catch (err: unknown) {
      showMessage(getErrMsg(err, "Error updating class"), true);
    } finally {
      setSubmitting(false);
    }
  };

  // ── DELETE ───────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    if (!confirm("Delete this masterclass? This cannot be undone.")) return;
    try {
      await api.delete(`/masterclasses/${id}`);
      showMessage("Masterclass deleted.");
      setExpandedId(null);
      void fetchMyClasses();
    } catch (err: unknown) {
      showMessage(
        getErrMsg(err, "Cannot delete — active enrollments exist"),
        true,
      );
    }
  };

  return (
    <>
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
            <span
              className="bg-amber-500/20 text-amber-400 font-medium text-xs
                px-2 py-0.5 rounded-full"
            >
              Coach
            </span>
          </div>
          <div className="flex items-center gap-6">
            <a
              href="/analytics"
              className="text-sm text-emerald-400 hover:text-emerald-300
                transition font-medium"
            >
              📊 Analytics
            </a>
            <a
              href="/browse"
              className="text-sm text-slate-400 hover:text-white transition flex items-center gap-1.5"
            >
              🔍 Browse Classes
            </a>
            <NotificationBell />
            <div className="flex items-center gap-3">
              <a
                href={`/coach/${user?.id}`}
                className="flex items-center gap-2 hover:opacity-80 transition"
              >
                <div
                  className="w-8 h-8 rounded-full bg-amber-500/20
                    flex items-center justify-center text-amber-400 font-bold text-sm"
                >
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm text-slate-300 hidden sm:block">
                  {user?.name}
                </span>
              </a>
              <button
                onClick={logout}
                className="text-xs text-slate-500 hover:text-slate-300 transition"
              >
                Sign out
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-6 py-8">
          {/* ── Page Title + New Class button ── */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-bold">Coach Dashboard</h1>
              <p className="text-slate-400 text-sm mt-1">
                Manage your masterclasses and students
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-center min-w-[100px]">
                <p className="text-xl font-bold text-amber-400">
                  {classes.length}
                </p>
                <p className="text-slate-500 text-xs mt-0.5">Published</p>
              </div>
              <button
                onClick={() => {
                  setShowForm(!showForm);
                  setEditTarget(null);
                }}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-medium text-sm px-5 py-2.5 rounded-xl transition self-stretch flex items-center justify-center"
              >
                {showForm ? "✕ Cancel" : "+ New Class"}
              </button>
            </div>
          </div>

          {/* ── Flash message ── */}
          {message && (
            <div
              className={`border rounded-xl px-4 py-3 mb-6 text-sm flex justify-between items-center ${
                isError
                  ? "bg-red-500/10 border-red-500/30 text-red-400"
                  : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              }`}
            >
              <span>{message}</span>
              <button
                onClick={() => setMessage("")}
                className={`${isError ? "text-red-600 hover:text-red-400" : "text-emerald-600 hover:text-emerald-400"} transition ml-4`}
              >
                ✕
              </button>
            </div>
          )}

          {/* ── CREATE FORM ── */}
          {showForm && (
            <form
              onSubmit={handleCreate}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-6 space-y-4"
            >
              <h3 className="font-semibold text-lg mb-2">
                Create New Masterclass
              </h3>

              <div>
                <label className="block text-sm text-slate-400 mb-1.5">
                  Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sicilian Defense: 6.Bg5 Variations"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 text-white
                      rounded-xl px-4 py-2.5 text-sm focus:outline-none
                      focus:border-emerald-500 transition"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1.5">
                  Description
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="What will students learn in this session?"
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  className="w-full bg-slate-800 border border-slate-700 text-white
                      rounded-xl px-4 py-2.5 text-sm focus:outline-none
                      focus:border-emerald-500 transition resize-none"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1.5">
                  Session Date & Time
                </label>
                <input
                  type="datetime-local"
                  required
                  value={form.session_date}
                  onChange={(e) =>
                    setForm({ ...form, session_date: e.target.value })
                  }
                  className="w-full bg-slate-800 border border-slate-700 text-white
                      rounded-xl px-4 py-2.5 text-sm focus:outline-none
                      focus:border-emerald-500 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1.5">
                    Category
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) =>
                      setForm({ ...form, category: e.target.value })
                    }
                    className="w-full bg-slate-800 border border-slate-700 text-white
                        rounded-xl px-4 py-2.5 text-sm focus:outline-none
                        focus:border-emerald-500 transition"
                  >
                    {["opening", "middlegame", "endgame", "tactics"].map(
                      (c) => (
                        <option key={c} value={c} className="capitalize">
                          {c}
                        </option>
                      ),
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1.5">
                    Capacity
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={200}
                    value={form.capacity}
                    onChange={(e) =>
                      setForm({ ...form, capacity: Number(e.target.value) })
                    }
                    className="w-full bg-slate-800 border border-slate-700 text-white
                        rounded-xl px-4 py-2.5 text-sm focus:outline-none
                        focus:border-emerald-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1.5">
                  YouTube / Video URL{" "}
                  <span className="text-slate-600 ml-1">(optional)</span>
                </label>
                <input
                  type="url"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={form.video_url}
                  onChange={(e) =>
                    setForm({ ...form, video_url: e.target.value })
                  }
                  className="w-full bg-slate-800 border border-slate-700 text-white
                      rounded-xl px-4 py-2.5 text-sm focus:outline-none
                      focus:border-emerald-500 transition"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1.5">
                  Upload PGN or Board Image{" "}
                  <span className="text-slate-600 ml-1">
                    (optional, max 10MB)
                  </span>
                </label>
                <input
                  type="file"
                  accept=".pgn,image/*"
                  onChange={(e) => setMediaFile(e.target.files?.[0] || null)}
                  className="w-full bg-slate-800 border border-slate-700 text-slate-300
                      rounded-xl px-4 py-2.5 text-sm focus:outline-none
                      focus:border-emerald-500 transition
                      file:mr-3 file:py-1 file:px-3 file:rounded-lg
                      file:border-0 file:text-xs file:font-medium
                      file:bg-slate-700 file:text-slate-300
                      hover:file:bg-slate-600"
                />
                {mediaFile && (
                  <p className="text-emerald-400 text-xs mt-1.5">
                    ✓ {mediaFile.name}
                  </p>
                )}
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50
                      text-slate-950 font-semibold px-6 py-2.5 rounded-xl text-sm transition"
                >
                  {submitting ? "Creating..." : "Create Masterclass"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setForm(emptyForm);
                    setMediaFile(null);
                  }}
                  className="border border-slate-700 hover:border-slate-500
                      text-slate-400 hover:text-white px-6 py-2.5 rounded-xl text-sm transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* ── EDIT MODAL ── */}
          {editTarget && (
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50
                flex items-center justify-center px-4"
              onClick={() => setEditTarget(null)}
            >
              <div
                className="bg-slate-900 border border-slate-800 rounded-2xl
                  w-full max-w-lg p-6 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-between items-center mb-5">
                  <h3 className="font-semibold text-lg">Edit Masterclass</h3>
                  <button
                    onClick={() => setEditTarget(null)}
                    className="text-slate-500 hover:text-white transition text-xl"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleEdit} className="space-y-4">
                  <div>
                    <label className="block text-sm text-slate-400 mb-1.5">
                      Title
                    </label>
                    <input
                      type="text"
                      required
                      value={editForm.title}
                      onChange={(e) =>
                        setEditForm({ ...editForm, title: e.target.value })
                      }
                      className="w-full bg-slate-800 border border-slate-700 text-white
                          rounded-xl px-4 py-2.5 text-sm focus:outline-none
                          focus:border-emerald-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-slate-400 mb-1.5">
                      Description
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={editForm.description}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          description: e.target.value,
                        })
                      }
                      className="w-full bg-slate-800 border border-slate-700 text-white
                          rounded-xl px-4 py-2.5 text-sm focus:outline-none
                          focus:border-emerald-500 transition resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-slate-400 mb-1.5">
                      Session Date
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={editForm.session_date}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          session_date: e.target.value,
                        })
                      }
                      className="w-full bg-slate-800 border border-slate-700 text-white
                          rounded-xl px-4 py-2.5 text-sm focus:outline-none
                          focus:border-emerald-500 transition"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-slate-400 mb-1.5">
                        Category
                      </label>
                      <select
                        value={editForm.category}
                        onChange={(e) =>
                          setEditForm({ ...editForm, category: e.target.value })
                        }
                        className="w-full bg-slate-800 border border-slate-700 text-white
                            rounded-xl px-4 py-2.5 text-sm focus:outline-none
                            focus:border-emerald-500 transition"
                      >
                        {["opening", "middlegame", "endgame", "tactics"].map(
                          (c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ),
                        )}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-slate-400 mb-1.5">
                        Capacity
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={200}
                        value={editForm.capacity}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            capacity: Number(e.target.value),
                          })
                        }
                        className="w-full bg-slate-800 border border-slate-700 text-white
                            rounded-xl px-4 py-2.5 text-sm focus:outline-none
                            focus:border-emerald-500 transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-slate-400 mb-1.5">
                      YouTube / Video URL{" "}
                      <span className="text-slate-600 ml-1">(optional)</span>
                    </label>
                    <input
                      type="url"
                      placeholder="https://www.youtube.com/watch?v=..."
                      value={editForm.video_url}
                      onChange={(e) =>
                        setEditForm({ ...editForm, video_url: e.target.value })
                      }
                      className="w-full bg-slate-800 border border-slate-700 text-white
                          rounded-xl px-4 py-2.5 text-sm focus:outline-none
                          focus:border-emerald-500 transition"
                    />
                  </div>

                  <div className="flex gap-3 pt-1">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 bg-emerald-500 hover:bg-emerald-400
                          disabled:opacity-50 text-slate-950 font-semibold
                          py-2.5 rounded-xl text-sm transition"
                    >
                      {submitting ? "Saving..." : "Save Changes"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditTarget(null)}
                      className="flex-1 border border-slate-700 hover:border-slate-500
                          text-slate-400 hover:text-white py-2.5 rounded-xl text-sm transition"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ── CLASSES LIST ── */}
          {classes.length === 0 ? (
            <div
              className="bg-slate-900 border border-slate-800 rounded-2xl
                p-16 text-center text-slate-500"
            >
              <p className="text-5xl mb-4">♟</p>
              <p className="text-slate-400 font-medium mb-1">
                No masterclasses yet
              </p>
              <p className="text-sm">
                Click &quot;+ New Class&quot; to publish your first one
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {classes.map((mc) => {
                const fillPct =
                  mc.capacity > 0
                    ? Math.round((mc.enrolled_count / mc.capacity) * 100)
                    : 0;
                const isExpanded = expandedId === mc.id;

                return (
                  <div
                    key={mc.id}
                    className="bg-slate-900 border border-slate-800 rounded-2xl
                        overflow-hidden hover:border-slate-700 transition"
                  >
                    {/* ── Class row ── */}
                    <div className="px-5 py-4 flex flex-wrap gap-4 items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full
                              capitalize font-medium ${CATEGORY_COLORS[mc.category]}`}
                          >
                            {mc.category}
                          </span>
                          {mc.seats_remaining === 0 && (
                            <span
                              className="text-xs px-2 py-0.5 rounded-full
                                bg-red-500/20 text-red-400"
                            >
                              Full
                            </span>
                          )}
                        </div>
                        <h3 className="font-semibold text-white truncate">
                          <a
                            href={`/class/${mc.id}`}
                            className="hover:text-emerald-400 transition"
                          >
                            {mc.title}
                          </a>
                        </h3>
                        <p className="text-slate-400 text-xs mt-0.5">
                          📅{" "}
                          {new Date(mc.session_date).toLocaleString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-6 text-sm">
                        <div className="text-center">
                          <p className="text-white font-semibold tabular-nums">
                            {mc.enrolled_count}/{mc.capacity}
                          </p>
                          <p className="text-slate-500 text-xs">enrolled</p>
                        </div>
                        <div className="text-center">
                          <p className="text-amber-400 font-semibold tabular-nums">
                            {mc.waitlist_count}
                          </p>
                          <p className="text-slate-500 text-xs">waitlist</p>
                        </div>
                        <div className="w-20">
                          <div className="flex justify-between text-xs text-slate-500 mb-1">
                            <span>{fillPct}%</span>
                          </div>
                          <div className="w-full bg-slate-800 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full transition-all ${
                                fillPct >= 75
                                  ? "bg-emerald-500"
                                  : fillPct >= 40
                                    ? "bg-amber-500"
                                    : "bg-slate-500"
                              }`}
                              style={{ width: `${fillPct}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEdit(mc)}
                          className="text-xs px-3 py-1.5 border border-slate-700
                              hover:border-emerald-500 text-slate-400
                              hover:text-emerald-400 rounded-lg transition"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => handleDelete(mc.id)}
                          className="text-xs px-3 py-1.5 border border-slate-700
                              hover:border-red-500 text-slate-400
                              hover:text-red-400 rounded-lg transition"
                        >
                          🗑 Delete
                        </button>
                        <button
                          onClick={() => toggleExpand(mc.id)}
                          className="text-xs px-3 py-1.5 border border-slate-700
                              hover:border-slate-500 text-slate-400
                              hover:text-white rounded-lg transition"
                        >
                          {isExpanded ? "▲ Hide" : "▼ Students"}
                        </button>
                      </div>
                    </div>

                    {/* ── Enrolled Students Panel ── */}
                    {isExpanded && (
                      <>
                        <div className="border-t border-slate-800 px-5 py-4">
                          <h4 className="text-sm font-medium text-slate-300 mb-3">
                            Enrolled Students
                            <span className="text-slate-500 font-normal ml-2">
                              ({mc.enrolled_count} active
                              {mc.waitlist_count > 0 &&
                                `, ${mc.waitlist_count} waitlisted`}
                              )
                            </span>
                          </h4>

                          {!enrolledMap[mc.id] ? (
                            <p className="text-slate-500 text-sm animate-pulse">
                              Loading...
                            </p>
                          ) : enrolledMap[mc.id].length === 0 ? (
                            <p className="text-slate-500 text-sm">
                              No students enrolled yet.
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {enrolledMap[mc.id].map((p) => (
                                <button
                                  key={p.id}
                                  onClick={async () => {
                                    try {
                                      const { data } = await api.get(
                                        `/profile/students/${p.player_id}`,
                                      );
                                      setStudentProfile({
                                        ...(data as StudentProfile),
                                        masterclass_id: mc.id,
                                        player_id: p.player_id,
                                      });
                                      setShowKickForm(false);
                                      setKickReason("");
                                    } catch {
                                      setStudentProfile({
                                        name: p.player_name,
                                        email: p.email,
                                        masterclass_id: mc.id,
                                        player_id: p.player_id,
                                      });
                                      setShowKickForm(false);
                                      setKickReason("");
                                    }
                                  }}
                                  className="w-full flex items-center justify-between
                                      bg-slate-800 hover:bg-slate-700/80 rounded-xl px-4 py-2.5 transition text-left cursor-pointer"
                                >
                                  <div>
                                    <p className="text-sm font-medium text-white">
                                      {p.player_name}
                                    </p>
                                    <p className="text-slate-400 text-xs">
                                      {p.email}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-4">
                                    <div className="text-right">
                                      <span
                                        className={`text-xs px-2 py-0.5 rounded-full ${
                                          p.status === "active"
                                            ? "bg-emerald-500/20 text-emerald-400"
                                            : "bg-amber-500/20 text-amber-400"
                                        }`}
                                      >
                                        {p.status}
                                      </span>
                                      <p className="text-slate-500 text-xs mt-0.5">
                                        {new Date(
                                          p.enrolled_at,
                                        ).toLocaleDateString()}
                                      </p>
                                    </div>
                                    <span className="text-slate-500 text-lg">
                                      ›
                                    </span>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* ── Materials Panel ── */}
                        <div className="border-t border-slate-800 px-5 py-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-medium text-slate-300">
                              📎 Class Materials
                              <span className="text-slate-500 font-normal ml-2">
                                ({materialsMap[mc.id]?.length || 0})
                              </span>
                            </h4>
                            <button
                              onClick={() => {
                                setAddingMat(
                                  addingMat === mc.id ? null : mc.id,
                                );
                                setMatForm({
                                  type: "link",
                                  title: "",
                                  url: "",
                                  description: "",
                                });
                              }}
                              className="text-xs text-emerald-400 hover:text-emerald-300 transition"
                            >
                              {addingMat === mc.id
                                ? "✕ Cancel"
                                : "+ Add Material"}
                            </button>
                          </div>

                          {/* Add material form */}
                          {addingMat === mc.id && (
                            <div className="bg-slate-800 rounded-xl p-4 mb-3 space-y-3">
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-xs text-slate-400 mb-1">
                                    Type
                                  </label>
                                  <select
                                    value={matForm.type}
                                    onChange={(e) =>
                                      setMatForm({
                                        ...matForm,
                                        type: e.target.value,
                                      })
                                    }
                                    className="w-full bg-slate-900 border border-slate-700 text-white
                                        rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 transition"
                                  >
                                    <option value="video">🎥 Video</option>
                                    <option value="article">📄 Article</option>
                                    <option value="reference">
                                      📚 Reference
                                    </option>
                                    <option value="document">
                                      📋 Document
                                    </option>
                                    <option value="link">🔗 Link</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-xs text-slate-400 mb-1">
                                    Title
                                  </label>
                                  <input
                                    type="text"
                                    required
                                    placeholder="Material title"
                                    value={matForm.title}
                                    onChange={(e) =>
                                      setMatForm({
                                        ...matForm,
                                        title: e.target.value,
                                      })
                                    }
                                    className="w-full bg-slate-900 border border-slate-700 text-white
                                        rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 transition"
                                  />
                                </div>
                              </div>
                              <div>
                                <label className="block text-xs text-slate-400 mb-1">
                                  URL
                                </label>
                                <input
                                  type="url"
                                  required
                                  placeholder="https://..."
                                  value={matForm.url}
                                  onChange={(e) =>
                                    setMatForm({
                                      ...matForm,
                                      url: e.target.value,
                                    })
                                  }
                                  className="w-full bg-slate-900 border border-slate-700 text-white
                                      rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 transition"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-slate-400 mb-1">
                                  Description{" "}
                                  <span className="text-slate-600">
                                    (optional)
                                  </span>
                                </label>
                                <input
                                  type="text"
                                  placeholder="Brief description"
                                  value={matForm.description}
                                  onChange={(e) =>
                                    setMatForm({
                                      ...matForm,
                                      description: e.target.value,
                                    })
                                  }
                                  className="w-full bg-slate-900 border border-slate-700 text-white
                                      rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 transition"
                                />
                              </div>
                              <button
                                onClick={async () => {
                                  if (!matForm.title || !matForm.url) return;
                                  try {
                                    await api.post(
                                      `/materials/${mc.id}`,
                                      matForm,
                                    );
                                    showMessage(
                                      "Material added & students notified!",
                                    );
                                    setAddingMat(null);
                                    const { data } = await api.get(
                                      `/materials/${mc.id}`,
                                    );
                                    setMaterialsMap((prev) => ({
                                      ...prev,
                                      [mc.id]: data as MaterialItem[],
                                    }));
                                  } catch (err: unknown) {
                                    showMessage(
                                      getErrMsg(err, "Failed to add material"),
                                      true,
                                    );
                                  }
                                }}
                                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950
                                  font-medium text-xs px-4 py-2 rounded-lg transition"
                              >
                                Add Material
                              </button>
                            </div>
                          )}

                          {/* Materials list */}
                          {materialsMap[mc.id]?.length > 0 ? (
                            <div className="space-y-2">
                              {materialsMap[mc.id].map((mat) => {
                                const typeIcon: Record<string, string> = {
                                  video: "🎥",
                                  article: "📄",
                                  reference: "📚",
                                  document: "📋",
                                  link: "🔗",
                                };
                                return (
                                  <div
                                    key={mat.id}
                                    className="flex items-center justify-between
                                        bg-slate-800 rounded-xl px-4 py-2.5"
                                  >
                                    <div className="flex items-center gap-3 min-w-0">
                                      <span className="text-lg flex-shrink-0">
                                        {typeIcon[mat.type] || "📎"}
                                      </span>
                                      <div className="min-w-0">
                                        <a
                                          href={mat.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-sm font-medium text-white
                                              hover:text-emerald-400 transition truncate block"
                                        >
                                          {mat.title}
                                        </a>
                                        {mat.description && (
                                          <p className="text-slate-500 text-xs truncate">
                                            {mat.description}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                    <button
                                      onClick={async () => {
                                        if (!confirm("Delete this material?"))
                                          return;
                                        try {
                                          await api.delete(
                                            `/materials/item/${mat.id}`,
                                          );
                                          setMaterialsMap((prev) => ({
                                            ...prev,
                                            [mc.id]: prev[mc.id].filter(
                                              (m) => m.id !== mat.id,
                                            ),
                                          }));
                                          showMessage("Material removed");
                                        } catch {
                                          showMessage("Failed to delete", true);
                                        }
                                      }}
                                      className="text-xs text-slate-500 hover:text-red-400
                                        transition flex-shrink-0 ml-3"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-slate-600 text-xs">
                              No materials added yet. Add videos, articles, or
                              references for your students.
                            </p>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* Student Profile Modal */}
      {studentProfile && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setStudentProfile(null)}
        >
          <div
            className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold">Student Profile</h3>
              <button
                onClick={() => setStudentProfile(null)}
                className="text-slate-500 hover:text-white transition text-lg"
              >
                ✕
              </button>
            </div>
            <div className="flex items-center gap-4 mb-5">
              <div
                className="w-14 h-14 rounded-full bg-emerald-500/20
                  flex items-center justify-center text-emerald-400 font-bold text-2xl"
              >
                {studentProfile.name?.charAt(0)?.toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-white text-lg">
                  {studentProfile.name}
                </p>
                <p className="text-slate-400 text-sm">{studentProfile.email}</p>
              </div>
            </div>
            <div className="space-y-3">
              {studentProfile.chess_rating && (
                <div className="bg-slate-800 rounded-xl px-4 py-3">
                  <p className="text-xs text-slate-500 mb-0.5">Chess Rating</p>
                  <p className="text-sm text-white font-medium">
                    {studentProfile.chess_rating}
                  </p>
                </div>
              )}
              {studentProfile.experience_level && (
                <div className="bg-slate-800 rounded-xl px-4 py-3">
                  <p className="text-xs text-slate-500 mb-0.5">
                    Experience Level
                  </p>
                  <p className="text-sm text-white font-medium capitalize">
                    {studentProfile.experience_level}
                  </p>
                </div>
              )}
              {studentProfile.bio && (
                <div className="bg-slate-800 rounded-xl px-4 py-3">
                  <p className="text-xs text-slate-500 mb-0.5">About</p>
                  <p className="text-sm text-slate-300 whitespace-pre-line leading-relaxed">
                    {studentProfile.bio}
                  </p>
                </div>
              )}
              {studentProfile.created_at && (
                <div className="bg-slate-800 rounded-xl px-4 py-3 flex justify-between items-center">
                  <p className="text-xs text-slate-500">Joined</p>
                  <p className="text-sm text-white font-medium">
                    {new Date(studentProfile.created_at).toLocaleDateString()}
                  </p>
                </div>
              )}
              {studentProfile.shared_classes &&
                studentProfile.shared_classes.length > 0 && (
                  <div className="bg-slate-800 rounded-xl px-4 py-3 flex justify-between items-center">
                    <p className="text-xs text-slate-500">Classes with you</p>
                    <p className="text-sm text-emerald-400 font-bold">
                      {studentProfile.shared_classes.length}
                    </p>
                  </div>
                )}

              {/* Kick Request Section */}
              <div className="pt-4 mt-2 border-t border-slate-800">
                {!showKickForm ? (
                  <button
                    onClick={() => setShowKickForm(true)}
                    className="text-xs text-slate-500 hover:text-red-400 transition"
                  >
                    Flag issue / Request Removal
                  </button>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs text-amber-400">
                      Request removal of this student. This will be reviewed by
                      an administrator.
                    </p>
                    <textarea
                      value={kickReason}
                      onChange={(e) => setKickReason(e.target.value)}
                      placeholder="Please provide a detailed reason..."
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-red-500 min-h-[80px]"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          if (!kickReason.trim()) {
                            showMessage("Please provide a reason", true);
                            return;
                          }
                          setSubmittingKick(true);
                          try {
                            const { data } = await api.post(
                              `/masterclasses/${studentProfile.masterclass_id}/kick/${studentProfile.player_id}`,
                              { reason: kickReason },
                            );
                            showMessage(data.message);
                            setShowKickForm(false);
                          } catch (err: unknown) {
                            showMessage(
                              getErrMsg(err, "Failed to submit request"),
                              true,
                            );
                          } finally {
                            setSubmittingKick(false);
                          }
                        }}
                        disabled={submittingKick || !kickReason.trim()}
                        className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-xs font-medium transition disabled:opacity-50"
                      >
                        {submittingKick ? "Submitting..." : "Submit Request"}
                      </button>
                      <button
                        onClick={() => setShowKickForm(false)}
                        className="px-3 py-1.5 text-slate-400 hover:text-white text-xs transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
