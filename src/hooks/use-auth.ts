import { useEffect, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export function useAuth() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadRole(userId: string) {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();
      if (active) setIsAdmin(!!data);
    }

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      const u = data.session?.user;
      if (u) {
        setUser({ id: u.id, email: u.email ?? "" });
        loadRole(u.id);
      }
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      const u = session?.user;
      if (u) {
        setUser({ id: u.id, email: u.email ?? "" });
        loadRole(u.id);
      } else {
        setUser(null);
        setIsAdmin(false);
      }
      router.invalidate();
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [router]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return { user, isAdmin, loading, signOut };
}