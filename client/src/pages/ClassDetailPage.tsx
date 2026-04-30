import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import api from "../utils/api";
import ReviewModal from "../components/ReviewModal";
import StarRating from "../components/StarRating";

interface ClassDetail {
  id: string;
  title: string;
  description: string;
  category: string;
  session_date: string;
  capacity: number;
  enrolled_count: number;
  seats_remaining: number;
  created_at: string;
  updated_at: string;
  video_url?: string;
  coach: { id: string; name: string; bio?: string };
  materials?: MaterialItem[];
}

interface MaterialItem {
  id: number;
  type: string;
  title: string;
  description: string | null;
  url: string;
  sort_order: number;
  created_at: string;
}

interface ReviewData {
  id: number;
  rating: number;
  comment: string | null;
  created_at: string;
  player_name: string;
}

// Shape of each item returned by /enrollments/my
interface RawEnrollmentItem {
  masterclass_id?: string;
  masterclass?: { id: string };
  status: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  opening: "bg-blue-500/20 text-blue-400",
  middlegame: "bg-purple-500/20 text-purple-400",
  endgame: "bg-amber-500/20 text-amber-400",
  tactics: "bg-red-500/20 text-red-400",
};

// Error message extractor
const getErrMsg = (err: unknown, fallback: string): string => {
  if (err && typeof err === "object" && "response" in err) {
    const r = (err as { response?: { data?: { message?: string } } }).response;
    return r?.data?.message ?? fallback;
  }
  return fallback;
};

export default function ClassDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [mc, setMc] = useState<ClassDetail | null>(null);
  const [reviews, setReviews] = useState<ReviewData[]>([]);
  const [avgRating, setAvgRating] = useState(0);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [actionMsg, setActionMsg] = useState("");
  const [isError, setIsError] = useState(false);
  const [myEnrollment, setMyEnrollment] = useState<string | null>(null);
  const [reviewTarget, setReviewTarget] = useState<boolean>(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [related, setRelated] = useState<ClassDetail[]>([]);

  useEffect(() => {
    if (!id) return;
    void (async () => {
      setLoading(true);
      try {
        // Fetch class detail
        const mcRes = await api.get(`/masterclasses/${id}`);
        setMc(mcRes.data);

        // Fetch reviews
        try {
          const revRes = await api.get(`/reviews/${id}`);
          setReviews(revRes.data.reviews || []);
          setAvgRating(revRes.data.average_rating || 0);
        } catch {
          /* non-critical */
        }

        // Check enrollment + bookmark
        if (user) {
          try {
            const enrRes = await api.get("/enrollments/my");
            const all: RawEnrollmentItem[] = [
              ...(enrRes.data.active ?? []),
              ...(enrRes.data.waitlisted ?? []),
            ];
            const found = all.find(
              (e) => e.masterclass_id === id || e.masterclass?.id === id,
            );
            setMyEnrollment(found?.status ?? null);
          } catch {
            /* non-critical */
          }

          try {
            const bmRes = await api.get("/bookmarks/ids");
            setIsBookmarked((bmRes.data as string[]).includes(id));
          } catch {
            /* non-critical */
          }
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [id, user]);

  // Fetch related classes once we have the category
  useEffect(() => {
    if (!mc) return;
    api
      .get(`/masterclasses?category=${mc.category}&limit=3`)
      .then((r) => {
        const others = ((r.data.data as ClassDetail[]) || []).filter(
          (c) => c.id !== mc.id,
        );
        setRelated(others.slice(0, 3));
      })
      .catch(() => {});
  }, [mc]);

  const flash = (msg: string, error = false) => {
    setActionMsg(msg);
    setIsError(error);
    setTimeout(() => setActionMsg(""), 5000);
  };

  const handleEnroll = async () => {
    if (!user) {
      navigate("/login");
      return;
    }
    setEnrolling(true);
    try {
      const { data } = await api.post(`/enrollments/${id}`);
      flash(data.message);
      setMyEnrollment(data.status);
      const r = await api.get(`/masterclasses/${id}`);
      setMc(r.data);
    } catch (err: unknown) {
      flash(getErrMsg(err, "Failed to enroll"), true);
    } finally {
      setEnrolling(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm("Cancel your enrollment?")) return;
    try {
      const { data } = await api.delete(`/enrollments/${id}`);
      flash(data.message);
      setMyEnrollment(null);
      const r = await api.get(`/masterclasses/${id}`);
      setMc(r.data);
    } catch (err: unknown) {
      flash(getErrMsg(err, "Failed to cancel"), true);
    }
  };

  const handleBookmarkToggle = async () => {
    if (!user) {
      navigate("/login");
      return;
    }
    try {
      const { data } = await api.post(`/bookmarks/${id}`);
      setIsBookmarked(data.bookmarked as boolean);
      flash(data.message);
    } catch (err: unknown) {
      flash(getErrMsg(err, "Failed to bookmark"), true);
    }
  };

  if (loading || !mc) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        {loading ? "Loading..." : "Masterclass not found"}
      </div>
    );
  }

  const isPast = new Date(mc.session_date) < new Date();
  const isFull = mc.seats_remaining <= 0;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* ── Header ── */}
      <header
        className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800/50
        px-6 py-4 flex justify-between items-center sticky top-0 z-20"
      >
        <div className="flex items-center gap-3">
          <a href="/" className="flex items-center gap-2">
            <span className="text-2xl">♟</span>
            <span className="font-bold text-lg">Chess Arena</span>
          </a>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/browse"
            className="text-sm text-slate-400 hover:text-white transition"
          >
            ← Browse
          </Link>
          {user ? (
            <Link
              to={`/${user.role}`}
              className="text-sm text-slate-400 hover:text-white transition"
            >
              Dashboard
            </Link>
          ) : (
            <a
              href="/login"
              className="text-sm text-emerald-400 hover:text-emerald-300 transition"
            >
              Sign In
            </a>
          )}
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* ── Action message ── */}
        {actionMsg && (
          <div
            className={`border rounded-xl px-4 py-3 mb-6 text-sm flex justify-between items-center ${
              isError
                ? "bg-red-500/10 border-red-500/30 text-red-400"
                : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
            }`}
          >
            <span>{actionMsg}</span>
            <button
              onClick={() => setActionMsg("")}
              className="ml-4 transition hover:opacity-70"
            >
              ✕
            </button>
          </div>
        )}

        {/* ── Class Header ── */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span
              className={`text-xs px-2.5 py-1 rounded-full capitalize
              font-medium ${CATEGORY_COLORS[mc.category]}`}
            >
              {mc.category}
            </span>
            {isPast && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-400">
                Ended
              </span>
            )}
            {!isPast && isFull && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">
                Full
              </span>
            )}
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold mb-3 leading-tight">
            {mc.title}
          </h1>

          <div className="flex items-center gap-4 flex-wrap text-sm text-slate-400">
            <Link
              to={`/coach/${mc.coach?.id}`}
              className="hover:text-emerald-400 transition flex items-center gap-1.5"
            >
              <div
                className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center
                justify-center text-amber-400 text-xs font-bold"
              >
                {mc.coach?.name?.charAt(0).toUpperCase()}
              </div>
              {mc.coach?.name}
            </Link>
            <span>
              📅{" "}
              {new Date(mc.session_date).toLocaleString("en-IN", {
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            {avgRating > 0 && (
              <span className="text-amber-400 flex items-center gap-1">
                ★ {avgRating}{" "}
                <span className="text-slate-500">({reviews.length})</span>
              </span>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* ── Main Content ── */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h2 className="font-semibold text-lg mb-3">About this class</h2>
              <p className="text-slate-300 leading-relaxed whitespace-pre-line">
                {mc.description}
              </p>
            </div>

            {/* Video Embed */}
            {mc.video_url &&
              (() => {
                const ytMatch = mc.video_url!.match(
                  /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/,
                );
                if (ytMatch) {
                  return (
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                      <div className="aspect-video">
                        <iframe
                          src={`https://www.youtube.com/embed/${ytMatch[1]}`}
                          title="Class Video"
                          className="w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    </div>
                  );
                }
                return (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                    <h2 className="font-semibold text-sm mb-2">
                      🎥 Class Video
                    </h2>
                    <a
                      href={mc.video_url!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-400 hover:text-emerald-300 text-sm transition break-all"
                    >
                      {mc.video_url}
                    </a>
                  </div>
                );
              })()}

            {/* Materials / Resources */}
            {mc.materials && mc.materials.length > 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <h2 className="font-semibold text-lg mb-4">
                  📎 Class Materials
                </h2>
                <div className="space-y-2">
                  {mc.materials.map((mat) => {
                    const icons: Record<string, string> = {
                      video: "🎥",
                      article: "📄",
                      reference: "📚",
                      document: "📋",
                      link: "🔗",
                    };
                    return (
                      <a
                        key={mat.id}
                        href={mat.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 bg-slate-800/60 hover:bg-slate-800
                        rounded-xl px-4 py-3 transition group"
                      >
                        <span className="text-lg flex-shrink-0">
                          {icons[mat.type] || "📎"}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p
                            className="text-sm font-medium text-white
                            group-hover:text-emerald-400 transition truncate"
                          >
                            {mat.title}
                          </p>
                          {mat.description && (
                            <p className="text-slate-500 text-xs truncate">
                              {mat.description}
                            </p>
                          )}
                        </div>
                        <span className="text-xs text-slate-600 capitalize flex-shrink-0">
                          {mat.type}
                        </span>
                      </a>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Reviews */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-lg">
                  Reviews{" "}
                  {reviews.length > 0 && (
                    <span className="text-slate-500 font-normal text-sm ml-1">
                      ({reviews.length})
                    </span>
                  )}
                </h2>
                {user && myEnrollment === "active" && isPast && (
                  <button
                    onClick={() => setReviewTarget(true)}
                    className="text-sm px-3 py-1.5 rounded-lg border border-slate-700
                    text-slate-400 hover:text-amber-400 hover:border-amber-500/40 transition"
                  >
                    ★ Write Review
                  </button>
                )}
              </div>

              {reviews.length === 0 ? (
                <p className="text-slate-500 text-sm">
                  No reviews yet. Be the first to review!
                </p>
              ) : (
                <div className="space-y-4">
                  {reviews.map((r) => (
                    <div
                      key={r.id}
                      className="border-b border-slate-800 last:border-0 pb-4 last:pb-0"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-white text-sm font-medium">
                            {r.player_name}
                          </span>
                          <StarRating value={r.rating} size="sm" />
                        </div>
                        <span className="text-slate-600 text-xs">
                          {new Date(r.created_at).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      {r.comment && (
                        <p className="text-slate-400 text-sm">{r.comment}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Sidebar ── */}
          <div className="space-y-4">
            {/* Enrollment card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-2xl font-bold text-white">
                    {mc.enrolled_count}/{mc.capacity}
                  </p>
                  <p className="text-slate-500 text-xs">students enrolled</p>
                </div>
                <div
                  className="w-14 h-14 rounded-full border-4 border-slate-800 flex items-center
                  justify-center"
                >
                  <span
                    className={`text-sm font-bold ${
                      mc.seats_remaining > 0
                        ? "text-emerald-400"
                        : "text-red-400"
                    }`}
                  >
                    {mc.seats_remaining > 0 ? mc.seats_remaining : 0}
                  </span>
                </div>
              </div>

              {/* Fill bar */}
              <div className="w-full bg-slate-800 rounded-full h-2 mb-4">
                <div
                  className={`h-2 rounded-full transition-all ${
                    mc.seats_remaining <= 0
                      ? "bg-red-500"
                      : mc.enrolled_count / mc.capacity >= 0.75
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                  }`}
                  style={{
                    width: `${Math.min(100, (mc.enrolled_count / mc.capacity) * 100)}%`,
                  }}
                />
              </div>

              {/* Action buttons */}
              {!isPast && (
                <div className="space-y-2">
                  {user?.role === "coach" ? (
                    <div
                      className="text-center py-3 px-4 rounded-xl bg-slate-800
                      border border-slate-700 text-slate-400 text-sm font-medium"
                    >
                      {user.id === mc.coach?.id
                        ? "✓ This is your masterclass"
                        : "ℹ️ Coaches cannot enroll"}
                    </div>
                  ) : myEnrollment === "active" ? (
                    <>
                      <div
                        className="text-center py-2 px-4 rounded-xl bg-emerald-500/10
                        border border-emerald-500/20 text-emerald-400 text-sm font-medium"
                      >
                        ✓ You are enrolled
                      </div>
                      <button
                        onClick={handleCancel}
                        className="w-full py-2 px-4 rounded-xl text-sm border
                        border-red-500/30 text-red-400 hover:border-red-500/60 transition"
                      >
                        Cancel Enrollment
                      </button>
                    </>
                  ) : myEnrollment === "waitlisted" ? (
                    <>
                      <div
                        className="text-center py-2 px-4 rounded-xl bg-amber-500/10
                        border border-amber-500/20 text-amber-400 text-sm font-medium"
                      >
                        ⏳ You are on the waitlist
                      </div>
                      <button
                        onClick={handleCancel}
                        className="w-full py-2 px-4 rounded-xl text-sm border
                        border-red-500/30 text-red-400 hover:border-red-500/60 transition"
                      >
                        Leave Waitlist
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={handleEnroll}
                      disabled={enrolling}
                      className="w-full py-3 px-4 rounded-xl text-sm font-semibold transition
                      bg-emerald-500 hover:bg-emerald-400 text-slate-950
                      disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {enrolling
                        ? "Enrolling..."
                        : isFull
                          ? "Join Waitlist"
                          : "Enroll Now"}
                    </button>
                  )}
                </div>
              )}

              {/* Bookmark */}
              {user?.role !== "coach" && (
                <button
                  onClick={handleBookmarkToggle}
                  className={`w-full mt-3 py-2 px-4 rounded-xl text-sm border transition ${
                    isBookmarked
                      ? "border-amber-500/40 text-amber-400 bg-amber-500/5"
                      : "border-slate-700 text-slate-400 hover:border-slate-500"
                  }`}
                >
                  {isBookmarked ? "🔖 Bookmarked" : "🔖 Save for later"}
                </button>
              )}
            </div>

            {/* Coach card */}
            <Link
              to={`/coach/${mc.coach?.id}`}
              className="block bg-slate-900 border border-slate-800 rounded-2xl p-5
              hover:border-slate-700 transition"
            >
              <p className="text-slate-500 text-xs mb-3">Taught by</p>
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center
                  justify-center text-amber-400 font-bold text-lg"
                >
                  {mc.coach?.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-white">{mc.coach?.name}</p>
                  <p className="text-slate-500 text-xs">View full profile →</p>
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* ── Related Classes ── */}
        {related.length > 0 && (
          <section className="mt-12">
            <h2 className="font-semibold text-lg mb-4">
              More in {mc.category}
            </h2>
            <div className="grid sm:grid-cols-3 gap-4">
              {related.map((rc) => (
                <Link
                  key={rc.id}
                  to={`/class/${rc.id}`}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-4
                  hover:border-slate-700 transition block"
                >
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full capitalize
                    font-medium ${CATEGORY_COLORS[rc.category]} inline-block mb-2`}
                  >
                    {rc.category}
                  </span>
                  <h3 className="font-medium text-white text-sm mb-1 line-clamp-2">
                    {rc.title}
                  </h3>
                  <p className="text-slate-500 text-xs">by {rc.coach?.name}</p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Review Modal */}
      {reviewTarget && id && (
        <ReviewModal
          masterclassId={id}
          masterclassTitle={mc.title}
          mode="create"
          onClose={() => setReviewTarget(false)}
          onSubmitted={(rating, comment) => {
            setReviewTarget(false);
            setReviews((prev) => [
              {
                id: Date.now(),
                rating,
                comment,
                created_at: new Date().toISOString(),
                player_name: user?.name || "You",
              },
              ...prev,
            ]);
            flash("Review submitted!");
          }}
        />
      )}
    </div>
  );
}
