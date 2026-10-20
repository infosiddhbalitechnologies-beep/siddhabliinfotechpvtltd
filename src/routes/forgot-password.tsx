import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, MailCheck } from "lucide-react";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Forgot Password — SIDDHBALI TECHNOLOGIES" },
      {
        name: "description",
        content:
          "Reset your SIDDHBALI TECHNOLOGIES account password.",
      },
    ],
  }),
  component: ForgotPassword,
});

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + "/reset-password",
      });
      if (error) throw error;
      setSent(true);
    } catch (err: any) {
      toast.error(err.message ?? "Could not send reset email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mx-auto max-w-md px-4 py-16">
      <div className="glass rounded-2xl p-8">
        {sent ? (
          <>
            <div className="size-10 grid place-items-center rounded-xl animated-gradient text-white">
              <MailCheck className="size-5" />
            </div>
            <h1 className="mt-4 text-3xl font-display font-bold">
              Check your email
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              If an account exists for <strong>{email}</strong>, we've sent a
              password reset link. Follow it to choose a new password.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-3xl font-display font-bold">
              Forgot password?
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Enter your account email and we'll send you a link to reset
              your password.
            </p>
            <form onSubmit={submit} className="mt-6 space-y-4">
              <div>
                <label className="text-sm font-medium block mb-1.5">
                  Email
                </label>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-10 rounded-lg bg-card border border-border px-3 text-sm"
                />
              </div>
              <button
                disabled={loading}
                className="w-full rounded-xl animated-gradient text-white px-6 py-3 text-sm font-medium shadow-elegant hover:opacity-90 transition disabled:opacity-60"
              >
                {loading ? "Sending…" : "Send reset link"}
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