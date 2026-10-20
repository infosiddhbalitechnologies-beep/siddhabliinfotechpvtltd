import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset Password — SIDDHBALI TECHNOLOGIES" },
      {
        name: "description",
        content: "Choose a new password for your SIDDHBALI TECHNOLOGIES account.",
      },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Supabase establishes a temporary recovery session from the tokens in
    // the URL and fires this event once that's done. We only show the form
    // after that, so this page can't be used without a valid reset link.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });

    // Covers the case where the event already fired before this listener
    // was attached (e.g. fast redirect) — a session existing here means the
    // recovery link was valid.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setDone(true);
      toast.success("Password updated");
    } catch (err: any) {
      toast.error(err.message ?? "Could not update password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mx-auto max-w-md px-4 py-16">
      <div className="glass rounded-2xl p-8">
        {done ? (
          <>
            <h1 className="text-3xl font-display font-bold">
              Password updated
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              You can now sign in with your new password.
            </p>
            <button
              onClick={() => navigate({ to: "/auth" })}
              className="mt-6 w-full rounded-xl animated-gradient text-white px-6 py-3 text-sm font-medium shadow-elegant hover:opacity-90 transition"
            >
              Go to sign in
            </button>
          </>
        ) : !ready ? (
          <>
            <h1 className="text-3xl font-display font-bold">
              Checking your link…
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              If this doesn't update in a few seconds, your reset link may be
              invalid or expired. Request a new one from the forgot password
              page.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-3xl font-display font-bold">
              Choose a new password
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Enter and confirm your new password below.
            </p>
            <form onSubmit={submit} className="mt-6 space-y-4">
              <div>
                <label className="text-sm font-medium block mb-1.5">
                  New password
                </label>
                <div className="relative">
                  <input
                    required
                    type={showPassword ? "text" : "password"}
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
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
              <div>
                <label className="text-sm font-medium block mb-1.5">
                  Confirm new password
                </label>
                <input
                  required
                  type={showPassword ? "text" : "password"}
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  className="w-full h-10 rounded-lg bg-card border border-border px-3 text-sm"
                />
              </div>
              <button
                disabled={loading}
                className="w-full rounded-xl animated-gradient text-white px-6 py-3 text-sm font-medium shadow-elegant hover:opacity-90 transition disabled:opacity-60"
              >
                {loading ? "Updating…" : "Update password"}
              </button>
            </form>
          </>
        )}
        <div className="mt-5 text-center text-sm text-muted-foreground">
          <Link
            to="/auth"
            className="inline-flex items-center gap-1 text-primary hover:underline"
          >
            <ArrowLeft className="size-3.5" /> Back to sign in
          </Link>
        </div>
      </div>
    </section>
  );
}