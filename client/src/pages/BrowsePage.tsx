import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import api from "../utils/api";
import ReviewModal from "../components/ReviewModal";
import ReviewsList from "../components/ReviewsList";

// ── Types ──────────────────────────────────────────────────────────────────────
interface Masterclass {
  id: string;
  title: string;
  description: string;
  category: string;
  session_date: string;
  created_at: string;
  updated_at: string;
  capacity: number;
  seats_remaining: number;
  enrolled_count: number;
  coach: { id: string; name: string };
}

interface ApiResponse {
  data: Masterclass[];
  total: number;
  page: number;
  total_pages: number;
}

interface Filters {
  search: string;
  coachName: string;
  category: string;
  available: boolean;
  dateFrom: string;
  dateTo: string;
  sortBy: string;
  sortOrder: string;
}

// Enrollment status per class
interface MyEnrollmentEntry {
  status: "active" | "waitlisted";
  waitlist_position?: number;
}

// Shape of each item returned by /enrollments/my
interface RawEnrollmentItem {
  masterclass_id: string;
  waitlist_position?: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const CATEGORY_COLORS: Record<string, string> = {
  opening: "bg-blue-500/20 text-blue-400",
  middlegame: "bg-purple-500/20 text-purple-400",
  endgame: "bg-amber-500/20 text-amber-400",
  tactics: "bg-red-500/20 text-red-400",
};

// True when a class was meaningfully edited after first save
const wasEdited = (created: string, updated: string) =>
  updated && new Date(updated).getTime() - new Date(created).getTime() > 5000;

// Error message extractor
const getErrMsg = (err: unknown, fallback: string): string => {
  if (err && typeof err === "object" && "response" in err) {
    const r = (err as { response?: { data?: { message?: string } } }).response;
    return r?.data?.message ?? fallback;
  }
  return fallback;
};

// ── Component ─────────────────────────────────────────────────────────────────
export default function BrowsePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [reviewTarget, setReviewTarget] = useState<{
    id: string;
    title: string;
  } | null>(null);

  // Enrollment status map
  const [myEnrollmentMap, setMyEnrollmentMap] = useState<
    Record<string, MyEnrollmentEntry>
  >({});

  // Bookmark state
  const [bookmarkIds, setBookmarkIds] = useState<Set<string>>(new Set());

  const [filters, setFilters] = useState<Filters>({
    search: "",
    coachName: "",
    category: "",
    available: false,
    dateFrom: "",
    dateTo: "",
    sortBy: "date",
    sortOrder: "ASC",
  });

  // ── Sync enrollment map from server ──────────────────────────────────────────
  const refreshEnrollmentMap = useCallback(() => {
    if (user?.role !== "player") return;
    api
      .get("/enrollments/my")
      .then((r) => {
        const map: Record<string, MyEnrollmentEntry> = {};
        (r.data.active ?? []).forEach((e: RawEnrollmentItem) => {
          map[e.masterclass_id] = { status: "active" };
        });
        (r.data.waitlisted ?? []).forEach((e: RawEnrollmentItem) => {
          map[e.masterclass_id] = {
            status: "waitlisted",
            waitlist_position: e.waitlist_position,
          };
        });
        setMyEnrollmentMap(map);
      })
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    refreshEnrollmentMap();
    if (user) {
      api
        .get("/bookmarks/ids")
        .then((r) => setBookmarkIds(new Set(r.data as string[])))
        .catch(() => {});
    }
  }, [refreshEnrollmentMap, user]);

  // ── Fetch classes ─────────────────────────────────────────────────────────────
  const fetchClasses = useCallback(
    async (p = 1) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (filters.search) params.append("search", filters.search);
        if (filters.coachName) params.append("coachName", filters.coachName);
        if (filters.category) params.append("category", filters.category);
        if (filters.available) params.append("available", "true");
        if (filters.dateFrom) params.append("dateFrom", filters.dateFrom);
        if (filters.dateTo) params.append("dateTo", filters.dateTo);
        if (filters.sortBy) params.append("sortBy", filters.sortBy);
        if (filters.sortOrder) params.append("sortOrder", filters.sortOrder);
        params.append("page", String(p));
        params.append("limit", "9");

        const { data } = await api.get<ApiResponse>(`/masterclasses?${params}`);
        setResponse(data);
        setPage(p);
      } finally {
        setLoading(false);
      }
    },
    [filters],
  );

  // AFTER
  useEffect(() => {
    void (async () => {
      await fetchClasses(1);
    })();
  }, [filters, fetchClasses]);

  // ── Enroll ────────────────────────────────────────────────────────────────────
  const handleEnroll = async (id: string) => {
    try {
      const { data } = await api.post(`/enrollments/${id}`);
      setMessage(data.message);
      setMyEnrollmentMap((prev) => ({
        ...prev,
        [id]: {
          status: data.status ?? "active",
          waitlist_position: data.waitlist_position ?? undefined,
        },
      }));
      refreshEnrollmentMap();
      void fetchClasses(page);
    } catch (err: unknown) {
      setMessage(getErrMsg(err, "Enrollment failed"));
    }
  };

  // ── Filter helpers ────────────────────────────────────────────────────────────
  const handleFilterChange = (key: keyof Filters, value: string | boolean) =>
    setFilters((prev) => ({ ...prev, [key]: value }));

  const clearFilters = () =>
    setFilters({
      search: "",
      coachName: "",
      category: "",
      available: false,
      dateFrom: "",
      dateTo: "",
      sortBy: "date",
      sortOrder: "ASC",
    });

  const activeFilterCount = [
    filters.search,
    filters.coachName,
    filters.category,
    filters.available,
    filters.dateFrom,
    filters.dateTo,
  ].filter(Boolean).length;

  // ── Enrollment button — 4 states ─────────────────────────────────────────────
  const renderEnrollButton = (mc: Masterclass) => {
    if (user?.role !== "player") return null;

    const isPast = new Date(mc.session_date) < new Date();
    const myEnrollment = myEnrollmentMap[mc.id];

    if (isPast) {
      return (
        <span
          className="flex-1 py-2 rounded-xl text-sm font-medium text-center
          bg-slate-800 text-slate-600 cursor-not-allowed select-none"
        >
          Session ended
        </span>
      );
    }
    if (myEnrollment?.status === "active") {
      return (
        <span
          className="flex-1 py-2 rounded-xl text-sm font-medium text-center
          bg-emerald-500/15 text-emerald-400 cursor-default select-none"
        >
          ✓ Enrolled
        </span>
      );
    }
    if (myEnrollment?.status === "waitlisted") {
      return (
        <span
          className="flex-1 py-2 rounded-xl text-sm font-medium text-center
          bg-amber-500/15 text-amber-400 cursor-default select-none"
        >
          ⏳ Waitlisted
          {myEnrollment.waitlist_position != null && (
            <span className="ml-1 text-xs opacity-80">
              #{myEnrollment.waitlist_position} in queue
            </span>
          )}
        </span>
      );
    }
    return (
      <button
        onClick={() => handleEnroll(mc.id)}
        className={`flex-1 py-2 rounded-xl text-sm font-medium transition ${
          mc.seats_remaining > 0
            ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950"
            : "bg-amber-500/20 hover:bg-amber-500/30 text-amber-400"
        }`}
      >
        {mc.seats_remaining > 0 ? "Enroll Now" : "Join Waitlist"}
      </button>
    );
  };

  // ── Bookmark toggle ───────────────────────────────────────────────────────────

  const handleBookmark = async (id: string) => {
    if (!user) {
      navigate("/login");
      return;
    }
    try {
      const { data } = await api.post(`/bookmarks/${id}`);
      setBookmarkIds((prev) => {
        const next = new Set(prev);
        if (data.bookmarked as boolean) {
          next.add(id);
        } else {
          next.delete(id);
        }
        return next;
      });
      setMessage(
        data.bookmarked
          ? "🔖 Class saved to bookmarks!"
          : "🔖 Bookmark removed",
      );
    } catch {
      setMessage("Failed to update bookmark");
    }
  };

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
          <span className="text-slate-600 text-sm">/ Browse</span>
        </div>
        <div className="flex gap-4 items-center">
          <a
            href="/coaches"
            className="text-sm text-emerald-400 hover:text-emerald-300 transition"
          >
            Browse Coaches
          </a>
          {user && (
            <a
              href={`/${user.role}`}
              className="text-sm text-slate-400 hover:text-white transition"
            >
              ← Dashboard
            </a>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* ── Page heading ── */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold">Browse Masterclasses</h2>
          <p className="text-slate-400 text-sm mt-1">
            {response?.total ?? 0} classes available
          </p>
        </div>

        {/* ── Filter Bar ── */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-6">
          {/* Row 1 — keyword + coach + category + available */}
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="flex-1 min-w-40">
              <input
                placeholder="Search by title or description..."
                value={filters.search}
                onChange={(e) => handleFilterChange("search", e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void fetchClasses(1)}
                className="w-full bg-slate-800 border border-slate-700 text-white
                  rounded-xl px-4 py-2.5 text-sm focus:outline-none
                  focus:border-emerald-500 transition"
              />
            </div>

            <input
              placeholder="Search by coach..."
              value={filters.coachName}
              onChange={(e) => handleFilterChange("coachName", e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void fetchClasses(1)}
              className="w-44 bg-slate-800 border border-slate-700 text-white
                rounded-xl px-4 py-2.5 text-sm focus:outline-none
                focus:border-emerald-500 transition"
            />

            <select
              value={filters.category}
              onChange={(e) => handleFilterChange("category", e.target.value)}
              className="bg-slate-800 border border-slate-700 text-white
                rounded-xl px-3 py-2.5 text-sm focus:outline-none
                focus:border-emerald-500 transition"
            >
              <option value="">All Categories</option>
              {["opening", "middlegame", "endgame", "tactics"].map((c) => (
                <option key={c} value={c} className="capitalize">
                  {c}
                </option>
              ))}
            </select>

            <label
              className="flex items-center gap-2 bg-slate-800
              border border-slate-700 rounded-xl px-4 py-2.5
              cursor-pointer hover:border-emerald-500 transition"
            >
              <input
                type="checkbox"
                checked={filters.available}
                onChange={(e) =>
                  handleFilterChange("available", e.target.checked)
                }
                className="accent-emerald-500 w-4 h-4"
              />
              <span className="text-sm text-slate-300">Available only</span>
            </label>
          </div>

          {/* Row 2 — date range + sort + clear */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2">
              <label className="text-slate-400 text-xs whitespace-nowrap">
                From
              </label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange("dateFrom", e.target.value)}
                className="bg-slate-800 border border-slate-700 text-white
                  rounded-xl px-3 py-2 text-sm focus:outline-none
                  focus:border-emerald-500 transition"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="text-slate-400 text-xs whitespace-nowrap">
                To
              </label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange("dateTo", e.target.value)}
                className="bg-slate-800 border border-slate-700 text-white
                  rounded-xl px-3 py-2 text-sm focus:outline-none
                  focus:border-emerald-500 transition"
              />
            </div>

            <select
              value={`${filters.sortBy}-${filters.sortOrder}`}
              onChange={(e) => {
                const [sortBy, sortOrder] = e.target.value.split("-");
                setFilters((f) => ({ ...f, sortBy, sortOrder }));
              }}
              className="bg-slate-800 border border-slate-700 text-white
                rounded-xl px-3 py-2 text-sm focus:outline-none
                focus:border-emerald-500 transition ml-auto"
            >
              <option value="date-ASC">Date: Earliest first</option>
              <option value="date-DESC">Date: Latest first</option>
              <option value="created-DESC">Newest listings</option>
              <option value="rating-DESC">⭐ Top rated</option>
            </select>

            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="text-sm text-slate-400 hover:text-white
                  transition flex items-center gap-1.5"
              >
                <span className="bg-slate-700 text-xs px-1.5 py-0.5 rounded-full">
                  {activeFilterCount}
                </span>
                Clear filters
              </button>
            )}
          </div>
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

        {/* ── Class grid ── */}
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="bg-slate-900 border border-slate-800
                rounded-2xl p-5 animate-pulse"
              >
                <div className="bg-slate-800 h-4 w-20 rounded mb-3" />
                <div className="bg-slate-800 h-5 w-3/4 rounded mb-2" />
                <div className="bg-slate-800 h-4 w-1/2 rounded mb-4" />
                <div className="bg-slate-800 h-10 w-full rounded-xl" />
              </div>
            ))}
          </div>
        ) : response?.data.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <p className="text-5xl mb-4">♟</p>
            <p className="text-lg font-medium text-slate-400 mb-1">
              No classes found
            </p>
            <p className="text-sm">Try adjusting your filters</p>
            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="mt-4 text-emerald-400 hover:text-emerald-300 text-sm transition"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {response?.data.map((mc) => {
              const isExpanded = expandedId === mc.id;
              const myEnrollment = myEnrollmentMap[mc.id];
              const canReview = myEnrollment?.status === "active";
              const isPast = new Date(mc.session_date) < new Date();
              const edited = wasEdited(mc.created_at, mc.updated_at);
              const isMyClass =
                user?.role === "coach" && mc.coach?.id === user?.id;

              return (
                <div
                  key={mc.id}
                  className={`bg-slate-900 border rounded-2xl overflow-hidden
                    hover:border-slate-700 transition ${
                      isMyClass ? "border-amber-500/40" : "border-slate-800"
                    }`}
                >
                  <div className="p-5">
                    {/* Top row — category + seat badge */}
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full
                          capitalize font-medium ${CATEGORY_COLORS[mc.category]}`}
                        >
                          {mc.category}
                        </span>
                        {isMyClass && (
                          <span
                            className="text-xs px-2 py-0.5 rounded-full
                            bg-amber-500/20 text-amber-400 font-medium"
                          >
                            Your class
                          </span>
                        )}
                      </div>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          mc.seats_remaining > 0
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-red-500/20 text-red-400"
                        }`}
                      >
                        {mc.seats_remaining > 0
                          ? `${mc.seats_remaining} seats left`
                          : "Full"}
                      </span>
                    </div>

                    {/* Title + coach */}
                    <a
                      href={`/class/${mc.id}`}
                      className="font-semibold text-white mb-1 leading-snug block
                        hover:text-emerald-400 transition"
                    >
                      {mc.title}
                    </a>
                    <p className="text-slate-400 text-xs mb-1">
                      by{" "}
                      <a
                        href={`/coach/${mc.coach?.id}`}
                        className="hover:text-emerald-400 transition"
                      >
                        {mc.coach?.name}
                      </a>
                    </p>

                    {/* Session date */}
                    <p
                      className={`text-xs mb-0.5 ${isPast ? "text-slate-600" : "text-slate-500"}`}
                    >
                      📅{" "}
                      {new Date(mc.session_date).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {isPast && <span className="ml-2 italic">ended</span>}
                    </p>

                    {/* Updated_at indicator */}
                    {edited && (
                      <p
                        className="text-slate-700 text-xs mb-1"
                        title={`Updated: ${new Date(mc.updated_at).toLocaleString("en-IN")}`}
                      >
                        ✎ Updated{" "}
                        {new Date(mc.updated_at).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                        })}
                      </p>
                    )}

                    {/* Description */}
                    <p
                      className="text-slate-400 text-xs leading-relaxed
                      line-clamp-2 mb-4 mt-2"
                    >
                      {mc.description}
                    </p>

                    {/* Capacity bar */}
                    <div className="mb-4">
                      <div className="flex justify-between text-xs text-slate-500 mb-1">
                        <span>{mc.enrolled_count} enrolled</span>
                        <span>{mc.capacity} seats</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full transition-all ${
                            mc.seats_remaining === 0
                              ? "bg-red-500"
                              : mc.seats_remaining <= mc.capacity * 0.2
                                ? "bg-amber-500"
                                : "bg-emerald-500"
                          }`}
                          style={{
                            width: `${(mc.enrolled_count / mc.capacity) * 100}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Action row */}
                    <div className="flex gap-2">
                      {renderEnrollButton(mc)}
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : mc.id)}
                        className="px-3 py-2 rounded-xl text-sm border
                          border-slate-700 hover:border-slate-500
                          text-slate-400 hover:text-white transition"
                      >
                        {isExpanded ? "▲" : "▼"}
                      </button>
                      {user?.role === "player" && (
                        <button
                          onClick={() => handleBookmark(mc.id)}
                          className={`px-3 py-2 rounded-xl text-sm border transition ${
                            bookmarkIds.has(mc.id)
                              ? "border-amber-500/40 text-amber-400 bg-amber-500/5"
                              : "border-slate-700 text-slate-400 hover:border-slate-500"
                          }`}
                          title={
                            bookmarkIds.has(mc.id)
                              ? "Remove bookmark"
                              : "Save for later"
                          }
                        >
                          🔖
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expandable reviews panel */}
                  {isExpanded && (
                    <div className="border-t border-slate-800 p-5">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="text-sm font-medium text-slate-300">
                          Reviews
                        </h4>
                        {canReview && isPast && (
                          <button
                            onClick={() =>
                              setReviewTarget({ id: mc.id, title: mc.title })
                            }
                            className="text-xs text-amber-400 hover:text-amber-300 transition"
                          >
                            ★ Write Review
                          </button>
                        )}
                      </div>
                      <ReviewsList masterclassId={mc.id} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── Pagination ── */}
        {response && response.total_pages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-8">
            <button
              onClick={() => void fetchClasses(page - 1)}
              disabled={page === 1}
              className="px-4 py-2 rounded-xl border border-slate-700
                text-slate-400 hover:text-white hover:border-slate-500
                disabled:opacity-30 disabled:cursor-not-allowed
                transition text-sm"
            >
              ← Prev
            </button>

            {Array.from({ length: response.total_pages }, (_, i) => i + 1)
              .filter(
                (p) =>
                  p === 1 ||
                  p === response.total_pages ||
                  Math.abs(p - page) <= 1,
              )
              .reduce<(number | "...")[]>((acc, p, i, arr) => {
                if (i > 0 && (p as number) - (arr[i - 1] as number) > 1)
                  acc.push("...");
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) =>
                p === "..." ? (
                  <span
                    key={`dots-${i}`}
                    className="text-slate-600 px-1 text-sm"
                  >
                    ...
                  </span>
                ) : (
                  <button
                    key={p}
                    onClick={() => void fetchClasses(p as number)}
                    className={`w-9 h-9 rounded-xl text-sm font-medium transition ${
                      page === p
                        ? "bg-emerald-500 text-slate-950"
                        : "border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500"
                    }`}
                  >
                    {p}
                  </button>
                ),
              )}

            <button
              onClick={() => void fetchClasses(page + 1)}
              disabled={page === response.total_pages}
              className="px-4 py-2 rounded-xl border border-slate-700
                text-slate-400 hover:text-white hover:border-slate-500
                disabled:opacity-30 disabled:cursor-not-allowed
                transition text-sm"
            >
              Next →
            </button>
          </div>
        )}
      </main>

      {/* ── Review Modal ── */}
      {reviewTarget && (
        <ReviewModal
          masterclassId={reviewTarget.id}
          masterclassTitle={reviewTarget.title}
          mode="create"
          onClose={() => setReviewTarget(null)}
          onSubmitted={() => {
            setMessage("Review submitted!");
            setReviewTarget(null);
          }}
        />
      )}
    </div>
  );
}
