import { useState, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

// Per-field error shape
interface FieldErrors {
  name?: string;
  email?: string;
  password?: string;
}

// Mirrors the Zod rules in auth.validator.ts — catches errors before the API call
const validateForm = (
  name: string,
  email: string,
  password: string,
): FieldErrors => {
  const errors: FieldErrors = {};

  if (!name.trim() || name.trim().length < 2)
    errors.name = "Name must be at least 2 characters";

  if (!email.trim()) errors.email = "Email is required";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
    errors.email = "Enter a valid email address";

  if (!password) errors.password = "Password is required";
  else if (password.length < 8)
    errors.password = "Password must be at least 8 characters";

  return errors;
};

export default function Register() {
  const { register } = useAuth();

  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "player",
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    // Clear the field error as soon as the user starts correcting it
    if (fieldErrors[name as keyof FieldErrors]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Client-side validation — stops API call if invalid
    const errors = validateForm(form.name, form.email, form.password);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);
    try {
      await register(form.name, form.email, form.password, form.role);
      if (form.role === "coach") {
        setSuccess(
          "Registration successful! Your account is pending admin approval.",
        );
      } else {
        // Player is now logged in — navigate to their dashboard
        navigate("/player");
      }
    } catch (err: unknown) {
      const r = (err as { response?: { data?: { message?: string } } })
        .response;
      setError(r?.data?.message ?? "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    {
      label: "Full Name",
      name: "name",
      type: "text",
      placeholder: "Arjun Sharma",
    },
    {
      label: "Email",
      name: "email",
      type: "email",
      placeholder: "you@example.com",
    },
    {
      label: "Password",
      name: "password",
      type: "password",
      placeholder: "••••••••",
    },
  ] as const;

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
            Join Chess Arena
          </h1>
          <p className="text-slate-500 text-sm mt-2 tracking-wide">
            Create your account to start playing
          </p>
        </div>

        {/* Error / Success */}
        {error && (
          <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl px-4 py-3 mb-6 text-sm">
            <span className="mt-0.5">⚠</span>
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="flex items-start gap-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl px-4 py-3 mb-6 text-sm">
            <span className="mt-0.5">✓</span>
            <span>{success}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {fields.map(({ label, name, type, placeholder }) => (
            <div className="space-y-1.5" key={name}>
              <label
                htmlFor={name}
                className="block text-xs font-medium text-slate-400 uppercase tracking-widest"
              >
                {label}
              </label>
              <input
                id={name}
                name={name}
                type={type}
                placeholder={placeholder}
                value={form[name as keyof typeof form]}
                onChange={handleChange}
                className={`w-full bg-white/[0.04] border hover:border-white/[0.14] text-white rounded-xl px-4 py-3 text-sm placeholder-slate-600 focus:outline-none focus:bg-white/[0.06] focus:ring-1 transition-all duration-200 ${
                  fieldErrors[name as keyof FieldErrors]
                    ? "border-red-500/50 focus:border-red-500/60 focus:ring-red-500/20"
                    : "border-white/[0.08] focus:border-emerald-500/60 focus:ring-emerald-500/20"
                }`}
                aria-describedby={
                  fieldErrors[name as keyof FieldErrors]
                    ? `${name}-error`
                    : undefined
                }
                aria-invalid={!!fieldErrors[name as keyof FieldErrors]}
              />
              {fieldErrors[name as keyof FieldErrors] && (
                <span
                  id={`${name}-error`}
                  className="block text-xs text-red-400 mt-1"
                >
                  {fieldErrors[name as keyof FieldErrors]}
                </span>
              )}
            </div>
          ))}

          <div className="space-y-1.5">
            <label
              htmlFor="role"
              className="block text-xs font-medium text-slate-400 uppercase tracking-widest"
            >
              I am a...
            </label>
            <select
              id="role"
              name="role"
              value={form.role}
              onChange={handleChange}
              className="w-full bg-[#111620] border border-white/[0.08] hover:border-white/[0.14] text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500/60 focus:bg-[#1a2130] focus:ring-1 focus:ring-emerald-500/20 transition-all duration-200 appearance-none"
            >
              <option value="player">Player — I want to learn chess</option>
              <option value="coach">Coach — I want to teach chess</option>
            </select>
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
                Creating account...
              </span>
            ) : (
              "Create Account"
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

        {/* Login link */}
        <p className="text-center text-slate-500 text-sm">
          Already have an account?{" "}
          <Link
            to="/login"
            className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors duration-150"
          >
            Sign in →
          </Link>
        </p>
      </div>
    </div>
  );
}
