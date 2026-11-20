"use client";

import type { Session } from "@supabase/supabase-js";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  return { session, loading };
}

export function useRequireSession(nextPath?: string) {
  const state = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!state.loading && !state.session) {
      router.replace(`/login?next=${encodeURIComponent(nextPath ?? pathname)}`);
    }
  }, [state.loading, state.session, router, pathname, nextPath]);

  return state;
}

export function safeNext(next: string | null): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/spaces";
}
