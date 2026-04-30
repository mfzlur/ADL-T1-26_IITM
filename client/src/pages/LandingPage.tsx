import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import api from '../utils/api';

interface FeaturedClass {
  id: string;
  title: string;
  description: string;
  category: string;
  session_date: string;
  capacity: number;
  enrolled_count: number;
  seats_remaining: number;
  coach: { id: string; name: string };
}

const CATEGORY_COLORS: Record<string, string> = {
  opening: 'bg-blue-500/20 text-blue-400',
  middlegame: 'bg-purple-500/20 text-purple-400',
  endgame: 'bg-amber-500/20 text-amber-400',
  tactics: 'bg-red-500/20 text-red-400',
};

export default function LandingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [featured, setFeatured] = useState<FeaturedClass[]>([]);
  const [stats, setStats] = useState({ classes: 0, players: 0, coaches: 0 });

  useEffect(() => {
    // If already logged in, redirect
    if (user) {
      navigate(`/${user.role}`, { replace: true });
      return;
    }
    // Fetch some public masterclasses
    api.get('/masterclasses?limit=6&sortBy=created&sortOrder=DESC')
      .then(r => {
        setFeatured(r.data.data || []);
        setStats({
          classes: r.data.total || 0,
          players: 0,
          coaches: 0,
        });
      })
      .catch(() => {});
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* ── Navbar ── */}
      <header className="bg-slate-950/80 backdrop-blur-md border-b border-slate-800/50
        px-6 py-4 flex justify-between items-center sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <span className="text-2xl">♟</span>
          <span className="font-bold text-lg">Chess Arena</span>
        </div>
        <div className="flex items-center gap-3">
          <a href="/browse"
            className="text-sm text-slate-400 hover:text-white transition px-3 py-2">
            Browse Classes
          </a>
          <a href="/login"
            className="text-sm text-slate-300 hover:text-white transition px-4 py-2
            border border-slate-700 rounded-xl hover:border-slate-500">
            Sign In
          </a>
          <a href="/register"
            className="text-sm bg-emerald-500 hover:bg-emerald-400 text-slate-950
            font-medium px-4 py-2 rounded-xl transition">
            Get Started
          </a>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2
          w-[800px] h-[500px] bg-emerald-500/8 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-[10%] right-[10%]
          w-[300px] h-[300px] bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-5xl mx-auto px-6 py-24 sm:py-32 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5
            bg-emerald-500/10 border border-emerald-500/20 rounded-full
            text-emerald-400 text-xs font-medium mb-6">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            Live Chess Education Platform
          </div>

          <h1 className="text-4xl sm:text-6xl font-bold leading-tight mb-6">
            Master Chess with{' '}
            <span className="bg-gradient-to-r from-emerald-400 to-cyan-400
              bg-clip-text text-transparent">
              World-Class Coaches
            </span>
          </h1>

          <p className="text-slate-400 text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            Join interactive masterclasses covering openings, middlegame strategy,
            endgame technique, and tactical puzzles. Learn from experienced coaches
            in a collaborative environment.
          </p>

          <div className="flex items-center justify-center gap-4 flex-wrap">
            <a href="/register"
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950
              font-semibold px-8 py-3.5 rounded-xl text-base transition
              shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30">
              Start Learning Free →
            </a>
            <a href="/browse"
              className="border border-slate-700 hover:border-slate-500
              text-slate-300 hover:text-white px-8 py-3.5 rounded-xl
              text-base transition">
              Browse Classes
            </a>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="border-y border-slate-800/50 bg-slate-900/30">
        <div className="max-w-5xl mx-auto px-6 py-10 grid grid-cols-3 gap-8 text-center">
          {[
            { label: 'Masterclasses', value: stats.classes || '50+', color: 'text-emerald-400' },
            { label: 'Expert Coaches', value: '15+', color: 'text-amber-400' },
            { label: 'Chess Categories', value: '4', color: 'text-blue-400' },
          ].map(s => (
            <div key={s.label}>
              <p className={`text-3xl sm:text-4xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-slate-500 text-sm mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Featured Classes ── */}
      {featured.length > 0 && (
        <section className="max-w-5xl mx-auto px-6 py-16">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold mb-2">Featured Masterclasses</h2>
            <p className="text-slate-400 text-sm">
              Explore top-rated sessions from our coaching community
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {featured.slice(0, 6).map(mc => {
              const isPast = new Date(mc.session_date) < new Date();
              return (
                <a key={mc.id} href={`/class/${mc.id}`}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-5
                  hover:border-slate-700 transition group block">
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full capitalize
                      font-medium ${CATEGORY_COLORS[mc.category]}`}>
                      {mc.category}
                    </span>
                    {isPast && (
                      <span className="text-xs px-2 py-0.5 rounded-full
                        bg-slate-700 text-slate-400">Ended</span>
                    )}
                    {!isPast && mc.seats_remaining <= 0 && (
                      <span className="text-xs px-2 py-0.5 rounded-full
                        bg-red-500/20 text-red-400">Full</span>
                    )}
                  </div>

                  <h3 className="font-semibold text-white mb-1.5 leading-snug
                    group-hover:text-emerald-400 transition line-clamp-2">
                    {mc.title}
                  </h3>

                  <p className="text-slate-400 text-sm mb-3">
                    by {mc.coach?.name}
                  </p>

                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>
                      📅 {new Date(mc.session_date).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric'
                      })}
                    </span>
                    <span>
                      {mc.enrolled_count}/{mc.capacity} enrolled
                    </span>
                  </div>
                </a>
              );
            })}
          </div>

          <div className="text-center mt-8">
            <a href="/browse"
              className="text-emerald-400 hover:text-emerald-300 text-sm font-medium transition">
              View all classes →
            </a>
          </div>
        </section>
      )}

      {/* ── How It Works ── */}
      <section className="bg-slate-900/30 border-y border-slate-800/50">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <h2 className="text-2xl font-bold text-center mb-10">How It Works</h2>
          <div className="grid sm:grid-cols-3 gap-8">
            {[
              {
                icon: '🎯',
                title: 'Browse & Discover',
                desc: 'Find masterclasses by category, coach, or date. Filter by openings, middlegame, endgame, or tactics.',
              },
              {
                icon: '📝',
                title: 'Enroll Instantly',
                desc: 'Reserve your seat with one click. If a class is full, join the waitlist and get auto-promoted when a spot opens.',
              },
              {
                icon: '⭐',
                title: 'Learn & Review',
                desc: 'Attend the session, improve your game, and leave a review to help other players choose the right class.',
              },
            ].map(step => (
              <div key={step.title} className="text-center">
                <div className="w-14 h-14 mx-auto mb-4 bg-slate-800 border border-slate-700
                  rounded-2xl flex items-center justify-center text-2xl">
                  {step.icon}
                </div>
                <h3 className="font-semibold text-white mb-2">{step.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="max-w-5xl mx-auto px-6 py-20 text-center">
        <h2 className="text-2xl sm:text-3xl font-bold mb-4">
          Ready to elevate your chess game?
        </h2>
        <p className="text-slate-400 text-base mb-8 max-w-lg mx-auto">
          Join hundreds of players learning from top coaches. Create your free account today.
        </p>
        <div className="flex justify-center gap-4 flex-wrap">
          <a href="/register"
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950
            font-semibold px-8 py-3 rounded-xl transition
            shadow-lg shadow-emerald-500/20">
            Create Free Account
          </a>
          <a href="/register"
            className="border border-slate-700 hover:border-amber-500/50
            text-slate-300 hover:text-amber-400 px-8 py-3 rounded-xl transition">
            Apply as Coach
          </a>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-slate-800/50 bg-slate-900/30">
        <div className="max-w-5xl mx-auto px-6 py-8 flex flex-col sm:flex-row
          justify-between items-center gap-4">
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <span>♟</span>
            <span>Chess Arena © {new Date().getFullYear()}</span>
          </div>
          <div className="flex items-center gap-6 text-slate-500 text-sm">
            <a href="/browse" className="hover:text-white transition">Browse</a>
            <a href="/login" className="hover:text-white transition">Sign In</a>
            <a href="/register" className="hover:text-white transition">Register</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
