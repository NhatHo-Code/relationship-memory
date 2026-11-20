"use client";

import { Button, buttonVariants } from "@heroui/react";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/use-session";

export function SiteHeader() {
  const { session, loading } = useSession();
  const router = useRouter();

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <header className="sticky top-0 z-30 border-b border-separator bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
        <NextLink href={session ? "/spaces" : "/"} className="flex items-baseline gap-2">
          <span className="font-serif text-xl font-semibold tracking-tight">Relationship Memory</span>
        </NextLink>
        {!loading && (
          <nav className="flex items-center gap-2">
            {session ? (
              <>
                <NextLink href="/spaces" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                  Không gian
                </NextLink>
                <span className="hidden max-w-48 truncate text-sm text-muted sm:inline">
                  {session.user.email}
                </span>
                <Button variant="outline" size="sm" onPress={signOut}>
                  Đăng xuất
                </Button>
              </>
            ) : (
              <NextLink href="/login" className={buttonVariants({ variant: "primary", size: "sm" })}>
                Đăng nhập
              </NextLink>
            )}
          </nav>
        )}
      </div>
    </header>
  );
}
