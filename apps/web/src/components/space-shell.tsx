"use client";

import { Skeleton } from "@heroui/react";
import NextLink from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { SpaceContext } from "@/components/space-context";
import { ApiError, apiFetch, type SpaceDetail } from "@/lib/api";
import { useRequireSession } from "@/lib/use-session";

export function SpaceShell({ children }: { children: ReactNode }) {
  const { spaceId } = useParams<{ spaceId: string }>();
  const pathname = usePathname();
  const { session } = useRequireSession();
  const [space, setSpace] = useState<SpaceDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    apiFetch<SpaceDetail>(`/v1/spaces/${spaceId}`)
      .then(setSpace)
      .catch((err) =>
        setError(
          err instanceof ApiError && err.status === 404
            ? "Không tìm thấy không gian này, hoặc bạn không phải thành viên."
            : "Không tải được không gian. Thử tải lại trang.",
        ),
      );
  }, [session, spaceId]);

  if (error) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <p role="alert" className="rounded-2xl bg-danger-soft px-5 py-4 text-danger-soft-foreground">
          {error}{" "}
          <NextLink href="/spaces" className="font-medium underline">
            Về danh sách không gian
          </NextLink>
        </p>
      </main>
    );
  }

  if (!space) {
    return (
      <main className="mx-auto flex max-w-4xl flex-col gap-4 px-4 py-12 sm:px-6">
        <Skeleton className="h-10 w-64 rounded-xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </main>
    );
  }

  const tabs = [
    { href: `/spaces/${spaceId}`, label: "Timeline" },
    { href: `/spaces/${spaceId}/chat`, label: "Hỏi AI" },
  ];

  return (
    <SpaceContext.Provider value={space}>
      <div className="border-b border-separator">
        <div className="mx-auto flex max-w-5xl flex-wrap items-end justify-between gap-4 px-4 pt-8 sm:px-6">
          <div className="pb-4">
            <NextLink href="/spaces" className="text-sm text-muted hover:text-foreground">
              ← Không gian
            </NextLink>
            <h1 className="font-serif text-3xl font-semibold">{space.name}</h1>
            <p className="text-sm text-muted">
              {space.members.map((m) => m.displayName ?? "Thành viên").join(" & ")}
            </p>
          </div>
          <nav aria-label="Chế độ xem" className="flex gap-1">
            {tabs.map((t) => {
              const active = pathname === t.href;
              return (
                <NextLink
                  key={t.href}
                  href={t.href}
                  aria-current={active ? "page" : undefined}
                  className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                    active ? "border-accent text-foreground" : "border-transparent text-muted hover:text-foreground"
                  }`}
                >
                  {t.label}
                </NextLink>
              );
            })}
          </nav>
        </div>
      </div>
      {children}
    </SpaceContext.Provider>
  );
}
