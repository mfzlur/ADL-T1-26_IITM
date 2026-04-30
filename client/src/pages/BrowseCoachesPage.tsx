import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import api from "../utils/api";

interface Coach {
  id: string;
  name: string;
  bio: string | null;
  chess_rating: number | null;
  experience_level: string | null;
  is_favorite?: boolean;
}

export default function BrowseCoachesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  // ── Declared before useEffect so it is never accessed before initialisation ──
  const fetchCoaches = useCallback(async () => {
    try {
      const { data } = await api.get("/profile/coaches");
      setCoaches(data);
    } catch {
      console.error("Failed to load coaches");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await fetchCoaches();
    })();
  }, [fetchCoaches]);

  const handleFavorite = async (coachId: string) => {
    if (!user) {
      navigate("/login");
      return;
    }
    try {
      const { data } = await api.post(`/profile/coaches/${coachId}/favorite`);
      setCoaches((prev) =>
        prev.map((c) =>
          c.id === coachId ? { ...c, is_favorite: data.is_favorite } : c,
        ),
      );
      setMessage(data.message);
    } catch {
      setMessage("Failed to update favorite status");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* ── Header ── */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <a
            href="/"
            className="flex items-center gap-2 hover:opacity-80 transition"
          >
            <span className="text-2xl">♟</span>
            <span className="font-bold text-lg">Chess Arena</span>
          </a>
          <span className="text-slate-600 text-sm">/ Browse Coaches</span>
        </div>
        <div className="flex gap-4 items-center">
          <a
            href="/browse"
            className="text-sm text-emerald-400 hover:text-emerald-300 transition"
          >
            Browse Classes
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
        <div className="mb-6">
          <h2 className="text-2xl font-bold">Browse Coaches</h2>
          <p className="text-slate-400 text-sm mt-1">
            {coaches.length} {coaches.length === 1 ? "coach" : "coaches"}{" "}
            available
          </p>
        </div>

        {message && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl px-4 py-3 mb-6 text-sm flex justify-between items-center">
            <span>{message}</span>
            <button
              onClick={() => setMessage("")}
              className="text-emerald-600 hover:text-emerald-400 transition ml-4"
            >
              ✕
            </button>
          </div>
        )}

        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 animate-pulse"
              >
                <div className="bg-slate-800 h-6 w-1/2 rounded mb-3" />
                <div className="bg-slate-800 h-4 w-full rounded mb-2" />
                <div className="bg-slate-800 h-4 w-3/4 rounded" />
              </div>
            ))}
          </div>
        ) : coaches.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <p className="text-5xl mb-4">♔</p>
            <p className="text-lg font-medium text-slate-400 mb-1">
              No coaches found
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {coaches.map((coach) => (
              <div
                key={coach.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg text-white">
                        <a
                          href={`/coach/${coach.id}`}
                          className="hover:text-emerald-400 transition"
                        >
                          {coach.name}
                        </a>
                      </h3>
                      {user?.id === coach.id && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-medium">
                          You
                        </span>
                      )}
                    </div>
                    {coach.experience_level && (
                      <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 capitalize">
                        {coach.experience_level}
                      </span>
                    )}
                  </div>
                  {user?.role === "player" && (
                    <button
                      onClick={() => handleFavorite(coach.id)}
                      className={`text-xl transition ${
                        coach.is_favorite
                          ? "text-amber-400 hover:text-amber-500"
                          : "text-slate-600 hover:text-amber-400"
                      }`}
                      title={
                        coach.is_favorite
                          ? "Remove from favorites"
                          : "Add to favorites"
                      }
                    >
                      {coach.is_favorite ? "★" : "☆"}
                    </button>
                  )}
                </div>

                {coach.chess_rating && (
                  <p className="text-sm text-amber-400 mb-3">
                    Rating: {coach.chess_rating} ELO
                  </p>
                )}

                <p className="text-sm text-slate-400 line-clamp-3">
                  {coach.bio || "No biography provided."}
                </p>

                <div className="mt-4 pt-4 border-t border-slate-800">
                  <a
                    href={`/coach/${coach.id}`}
                    className="text-sm font-medium text-emerald-400 hover:text-emerald-300 transition"
                  >
                    View Full Profile →
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
