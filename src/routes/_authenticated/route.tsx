import {
  createFileRoute,
  Outlet,
  redirect,
  useNavigate,
  useLocation,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      // Send the user to sign in, remembering where they were headed (e.g.
      // /raise-ticket) so they land back there instead of the dashboard
      // once they've authenticated.
      throw redirect({ to: "/auth", search: { redirect: location.href } });
    }
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

// Defense in depth: `beforeLoad` above is the primary guard, but it only
// runs once per route-entry lifecycle. This component-level check uses
// the SAME `useAuth()` session (no second auth system) — including the
// router.invalidate() fix already applied inside that hook — to make
// sure the protected UI (and therefore any authenticated server-function
// call like submitTicket) can never render/fire without a confirmed
// session, even if `beforeLoad` doesn't end up blocking for any reason.
function AuthenticatedLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/auth", search: { redirect: location.href } });
    }
  }, [loading, user, navigate, location.href]);

  if (loading || !user) return null;

  return <Outlet />;
}