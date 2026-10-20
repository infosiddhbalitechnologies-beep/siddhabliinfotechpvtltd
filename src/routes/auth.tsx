import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";
import { z } from "zod";

// Optional `redirect` search param: where to send the user after a
// successful sign-in (e.g. back to /raise-ticket). Defaults to /dashboard.
const searchSchema = z.object({ redirect: z.string().optional() });

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — SIDDHBALI TECHNOLOGIES" },
      {
        name: "description",
        content:
          "Sign in or create an account to track your tickets with SIDDHBALI TECHNOLOGIES.",
      },
    ],
  }),
  validateSearch: (s) => searchSchema.parse(s),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const dest = redirect && redirect.startsWith("/") ? redirect : "/dashboard";
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: dest });
    });
    // Only run once on mount — `dest` is derived from the initial search param.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name },
            emailRedirectTo: window.location.origin + dest,
          },
        });
        if (error) throw error;
        toast.success(
          "Account created. Check your email to verify, then sign in.",
        );
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        toast.success("Signed in");
        navigate({ to: dest });
      }
    } catch (err: any) {
      toast.error(err.message ?? "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mx-auto max-w-md px-4 py-16">
      <div className="glass rounded-2xl p-8">
        <h1 className="text-3xl font-display font-bold">
          {mode === "signup" ? "Create account" : "Welcome back"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {mode === "signup"
            ? "Sign up to submit and track your tickets."
            : "Sign in to view and manage your tickets."}
        </p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          {mode === "signup" && (
            <div>
              <label className="text-sm font-medium block mb-1.5">
                Full name
              </label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-10 rounded-lg bg-card border border-border px-3 text-sm"
              />
            </div>
          )}
          <div>
            <label className="text-sm font-medium block mb-1.5">Email</label>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-10 rounded-lg bg-card border border-border px-3 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1.5">Password</label>
            <div className="relative">
              <input
                required
                type={showPassword ? "text" : "password"}
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={
                  mode === "signup" ? "new-password" : "current-password"
                }
                className="w-full h-10 rounded-lg bg-card border border-border pl-3 pr-10 text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                tabIndex={0}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded-r-lg"
              >
                {showPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
          </div>
          {mode === "signin" && (
            <div className="text-right -mt-1">
              <Link
                to="/forgot-password"
                className="text-xs text-primary hover:underline"
              >
                Forgot password?
              </Link>
            </div>
          )}
          <button
            disabled={loading}
            className="w-full rounded-xl animated-gradient text-white px-6 py-3 text-sm font-medium shadow-elegant hover:opacity-90 transition disabled:opacity-60"
          >
            {loading
              ? "Please wait…"
              : mode === "signup"
                ? "Create account"
                : "Sign in"}
          </button>
        </form>
        <div className="mt-5 text-center text-sm text-muted-foreground">
          {mode === "signup" ? (
            <>
              Already have an account?{" "}
              <button
                onClick={() => setMode("signin")}
                className="text-primary hover:underline"
              >
                Sign in
              </button>
            </>
          ) : (
            <>
              New here?{" "}
              <button
                onClick={() => setMode("signup")}
                className="text-primary hover:underline"
              >
                Create an account
              </button>
            </>
          )}
        </div>
        <div className="mt-3 text-center text-xs text-muted-foreground">
          Guest?{" "}
          <Link to="/track" className="text-primary hover:underline">
            Track a ticket by number
          </Link>
        </div>
      </div>
    </section>
  );
}