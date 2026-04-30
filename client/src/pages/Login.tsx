import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function Login() {
  const { login, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to={`/${user.role}`} replace />;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: unknown) {
      const r = (err as { response?: { data?: { message?: string } } })
        .response;
      setError(r?.data?.message ?? "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080b11] flex items-center justify-center px-4 relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-5%] right-[-5%] w-[400px] h-[400px] bg-emerald-700/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Card */}
      <div className="relative z-10 w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-5 text-3xl shadow-lg shadow-emerald-900/30">
            ♟
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Chess Arena
          </h1>
          <p className="text-slate-500 text-sm mt-2 tracking-wide">
            Welcome back — sign in to continue
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl px-4 py-3 mb-6 text-sm">
            <span className="mt-0.5">⚠</span>
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-widest">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="w-full bg-white/[0.04] border border-white/[0.08] hover:border-white/[0.14] text-white rounded-xl px-4 py-3 text-sm placeholder-slate-600 focus:outline-none focus:border-emerald-500/60 focus:bg-white/[0.06] focus:ring-1 focus:ring-emerald-500/20 transition-all duration-200"
            />
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-widest">
                Password
              </label>
              <Link
                to="/forgot-password"
                className="text-xs text-slate-500 hover:text-emerald-400 transition-colors duration-150"
              >
                Forgot password?
              </Link>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full bg-white/[0.04] border border-white/[0.08] hover:border-white/[0.14] text-white rounded-xl px-4 py-3 text-sm placeholder-slate-600 focus:outline-none focus:border-emerald-500/60 focus:bg-white/[0.06] focus:ring-1 focus:ring-emerald-500/20 transition-all duration-200"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 relative bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-semibold rounded-xl py-3 text-sm transition-all duration-200 shadow-lg shadow-emerald-900/30 hover:shadow-emerald-800/40"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="animate-spin h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8z"
                  />
                </svg>
                Signing in…
              </span>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-white/[0.06]" />
          <span className="text-slate-600 text-xs tracking-widest uppercase">
            or
          </span>
          <div className="flex-1 h-px bg-white/[0.06]" />
        </div>

        {/* Register link */}
        <p className="text-center text-slate-500 text-sm">
          New to Chess Arena?{" "}
          <Link
            to="/register"
            className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors duration-150"
          >
            Create an account →
          </Link>
        </p>
      </div>
    </div>
  );
}
