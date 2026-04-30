import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import api from "../utils/api";

interface CoachProfile {
  id: string;
  name: string;
  bio: string | null;
  chess_rating: number | null;
  experience_level: string | null;
  created_at: string;
  stats: {
    total_classes: number;
    total_students: number;
    average_rating: number;
    total_reviews: number;
  };
  classes: {
    id: string;
    title: string;
    description: string;
    session_date: string;
    category: string;
    capacity: number;
    enrolled_count: number;
    seats_remaining: number;
    average_rating: number;
    review_count: number;
  }[];
}

const CATEGORY_COLORS: Record<string, string> = {
  opening: "bg-blue-500/20 text-blue-400",
  middlegame: "bg-purple-500/20 text-purple-400",
  endgame: "bg-amber-500/20 text-amber-400",
  tactics: "bg-red-500/20 text-red-400",
};

export default function CoachProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [profile, setProfile] = useState<CoachProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    if (!id) return;
    void (async () => {
      setLoading(true);
      try {
        const [profileRes, favRes] = await Promise.all([
          api.get(`/profile/coach/${id}`),
          user?.role === "player"
            ? api.get("/profile/me/favorite-coaches")
            : Promise.resolve({ data: [] }),
        ]);
        setProfile(profileRes.data);
        if (user?.role === "player") {
          setIsFavorite(
            (favRes.data as { id: string }[]).some((f) => f.id === id),
          );
        }
      } catch (err: unknown) {
        const r = (err as { response?: { data?: { message?: string } } })
          .response;
        setError(r?.data?.message ?? "Coach not found");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, user]);

  const handleFavorite = async () => {
    if (!user) {
      window.location.href = "/login";
      return;
    }
    try {
      const { data } = await api.post(`/profile/coaches/${id}/favorite`);
      setIsFavorite(data.is_favorite as boolean);
    } catch {
      // silently ignore — UI stays unchanged on failure
    }
  };

  if (loading) {
    return (
      <div
        className="min-h-screen bg-slate-950 flex items-center justify-center
        text-slate-400 animate-pulse"
      >
        Loading coach profile...
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
        <p className="text-slate-400">{error || "Coach not found"}</p>
        <Link
          to="/browse"
          className="text-emerald-400 hover:text-emerald-300 text-sm transition"
        >
          ← Back to Browse
        </Link>
      </div>
    );
  }

  const upcoming = profile.classes.filter(
    (c) => new Date(c.session_date) > new Date(),
  );
  const past = profile.classes.filter(
    (c) => new Date(c.session_date) <= new Date(),
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* ── Header ── */}
      <header
        className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800/50
        px-6 py-4 flex justify-between items-center sticky top-0 z-20"
      >
        <a href="/" className="flex items-center gap-2">
          <span className="text-2xl">♟</span>
          <span className="font-bold text-lg">Chess Arena</span>
        </a>
        <Link
          to="/browse"
          className="text-sm text-slate-400 hover:text-white transition"
        >
          ← Browse
        </Link>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* ── Profile Header ── */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-8">
          <div className="flex items-start gap-5 flex-wrap">
            {/* Avatar */}
            <div
              className="w-20 h-20 rounded-2xl bg-amber-500/20 flex items-center
              justify-center text-amber-400 font-bold text-3xl flex-shrink-0"
            >
              {profile.name.charAt(0).toUpperCase()}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap mb-2">
                <h1 className="text-2xl font-bold">{profile.name}</h1>
                <span
                  className="text-xs px-2.5 py-1 rounded-full
                  bg-amber-500/20 text-amber-400 font-medium"
                >
                  Coach
                </span>
                {user?.role === "player" && (
                  <button
                    onClick={handleFavorite}
                    className={`ml-auto text-2xl transition ${isFavorite ? "text-amber-400 hover:text-amber-500" : "text-slate-600 hover:text-amber-400"}`}
                    title={
                      isFavorite ? "Remove from favorites" : "Add to favorites"
                    }
                  >
                    {isFavorite ? "★" : "☆"}
                  </button>
                )}
              </div>

              {profile.bio && (
                <p className="text-slate-300 text-sm leading-relaxed mb-4 max-w-2xl">
                  {profile.bio}
                </p>
              )}

              <div className="flex items-center gap-2 text-slate-500 text-xs flex-wrap">
                {profile.chess_rating && (
                  <span className="px-2 py-1 bg-slate-800 rounded-lg">
                    Rating: {profile.chess_rating}
                  </span>
                )}
                {profile.experience_level && (
                  <span className="px-2 py-1 bg-slate-800 rounded-lg capitalize">
                    {profile.experience_level}
                  </span>
                )}
                <span className="px-2 py-1 bg-slate-800 rounded-lg">
                  Joined{" "}
                  {new Date(profile.created_at).toLocaleDateString("en-IN", {
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* Stats bar */}
          <div className="grid grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800">
            {[
              {
                label: "Classes",
                value: profile.stats.total_classes,
                color: "text-blue-400",
              },
              {
                label: "Students",
                value: profile.stats.total_students,
                color: "text-emerald-400",
              },
              {
                label: "Avg Rating",
                value:
                  profile.stats.average_rating > 0
                    ? `★ ${profile.stats.average_rating}`
                    : "—",
                color: "text-amber-400",
              },
              {
                label: "Reviews",
                value: profile.stats.total_reviews,
                color: "text-purple-400",
              },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-slate-500 text-xs mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Upcoming Classes ── */}
        {upcoming.length > 0 && (
          <section className="mb-8">
            <h2 className="text-base font-semibold text-slate-300 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Upcoming Classes ({upcoming.length})
            </h2>
            <div className="space-y-3">
              {upcoming.map((mc) => (
                <Link
                  key={mc.id}
                  to={`/class/${mc.id}`}
                  className="block bg-slate-900 border border-slate-800 rounded-2xl p-5
                  hover:border-slate-700 transition"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full capitalize
                          font-medium ${CATEGORY_COLORS[mc.category]}`}
                        >
                          {mc.category}
                        </span>
                        {mc.seats_remaining <= 0 && (
                          <span
                            className="text-xs px-2 py-0.5 rounded-full
                            bg-red-500/20 text-red-400"
                          >
                            Full
                          </span>
                        )}
                      </div>
                      <h3 className="font-semibold text-white mb-1">
                        {mc.title}
                      </h3>
                      <p className="text-slate-500 text-xs">
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
                    <div className="text-right flex-shrink-0">
                      <p className="text-white font-semibold text-sm">
                        {mc.enrolled_count}/{mc.capacity}
                      </p>
                      <p className="text-slate-500 text-xs">enrolled</p>
                      {mc.average_rating > 0 && (
                        <p className="text-amber-400 text-xs mt-1">
                          ★ {mc.average_rating} ({mc.review_count})
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── Past Classes ── */}
        {past.length > 0 && (
          <section>
            <h2 className="text-base font-semibold text-slate-300 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-slate-500" />
              Past Classes ({past.length})
            </h2>
            <div className="space-y-2">
              {past.map((mc) => (
                <Link
                  key={mc.id}
                  to={`/class/${mc.id}`}
                  className="block bg-slate-900/50 border border-slate-800/50 rounded-xl p-4
                  hover:border-slate-700 transition"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full capitalize
                          font-medium ${CATEGORY_COLORS[mc.category]}`}
                        >
                          {mc.category}
                        </span>
                      </div>
                      <h3 className="font-medium text-slate-300 text-sm">
                        {mc.title}
                      </h3>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 text-xs">
                      <span className="text-slate-500">
                        {mc.enrolled_count} students
                      </span>
                      {mc.average_rating > 0 && (
                        <span className="text-amber-400">
                          ★ {mc.average_rating}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
