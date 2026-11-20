"use client";

import { Button, Card, Skeleton, useOverlayState } from "@heroui/react";
import type { MemoryDto } from "@rm/shared";
import { useRouter, useSearchParams } from "next/navigation";
import { Fragment, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { PlusIcon } from "@/components/icons";
import { InvitePanel } from "@/components/invite-panel";
import { MemoryCard } from "@/components/memory-card";
import { MemoryFormModal } from "@/components/memory-form-modal";
import { useSpace } from "@/components/space-context";
import { apiFetch, type MemoryPage } from "@/lib/api";
import { monthKey, monthLabel } from "@/lib/format";

function Timeline() {
  const space = useSpace();
  const router = useRouter();
  const searchParams = useSearchParams();
  const formState = useOverlayState();
  const [memories, setMemories] = useState<MemoryDto[] | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSavedId, setJustSavedId] = useState<string | null>(null);

  const loadFirst = useCallback(
    () =>
      apiFetch<MemoryPage>(`/v1/spaces/${space.id}/memories?limit=20`)
        .then((page) => {
          setMemories(page.items);
          setCursor(page.nextCursor);
        })
        .catch(() => setError("Không tải được kỷ niệm. Thử tải lại trang.")),
    [space.id],
  );

  useEffect(() => {
    apiFetch<MemoryPage>(`/v1/spaces/${space.id}/memories?limit=20`)
      .then((page) => {
        setMemories(page.items);
        setCursor(page.nextCursor);
      })
      .catch(() => setError("Không tải được kỷ niệm. Thử tải lại trang."));
  }, [space.id]);

  const { open } = formState;
  useEffect(() => {
    if (searchParams.get("new") === "1") {
      open();
      router.replace(`/spaces/${space.id}`, { scroll: false });
    }
  }, [searchParams, open, router, space.id]);

  async function loadMore() {
    if (!cursor) return;
    setLoadingMore(true);
    try {
      const page = await apiFetch<MemoryPage>(
        `/v1/spaces/${space.id}/memories?limit=20&cursor=${encodeURIComponent(cursor)}`,
      );
      setMemories((prev) => [...(prev ?? []), ...page.items]);
      setCursor(page.nextCursor);
    } finally {
      setLoadingMore(false);
    }
  }

  async function onCreated(memory: MemoryDto) {
    setJustSavedId(memory.id);
    await loadFirst();
  }

  const groups = useMemo(() => {
    const map = new Map<string, MemoryDto[]>();
    for (const m of memories ?? []) {
      const key = monthKey(m.eventDate);
      map.set(key, [...(map.get(key) ?? []), m]);
    }
    return [...map.entries()];
  }, [memories]);

  const isOwner = space.role === "owner";
  const isAlone = space.members.length < 2;
  let index = 0;

  return (
    <div data-couple-theme="polaroid" className="min-h-[70dvh]">
      <main className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-muted">
            {memories ? `${memories.length}${cursor ? "+" : ""} kỷ niệm` : "Đang mở album…"}
          </p>
          <Button onPress={formState.open} size="lg">
            <PlusIcon />
            Thêm kỷ niệm
          </Button>
        </div>

        {isOwner && isAlone && <InvitePanel spaceId={space.id} />}

        {error && (
          <p role="alert" className="rounded-2xl bg-danger-soft px-5 py-4 text-danger-soft-foreground">
            {error}
          </p>
        )}

        {!memories && !error && (
          <div className="flex flex-col gap-4 pl-8">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-36 w-full rounded-2xl" />
            ))}
          </div>
        )}

        {memories?.length === 0 && (
          <Card>
            <Card.Content className="flex flex-col items-center gap-4 py-12 text-center">
              <p className="font-serif text-2xl">Trang đầu tiên còn trống</p>
              <p className="max-w-[40ch] text-muted">
                Bắt đầu bằng một kỷ niệm nhỏ: lần đầu gặp, một bữa ăn, một câu nói còn nhớ.
              </p>
              <Button onPress={formState.open}>
                <PlusIcon />
                Viết kỷ niệm đầu tiên
              </Button>
            </Card.Content>
          </Card>
        )}

        {groups.length > 0 && (
          <ol className="relative flex flex-col">
            <span aria-hidden className="absolute bottom-0 left-[0.625rem] top-0 w-px bg-border md:left-1/2" />
            {groups.map(([key, items]) => {
              const { month, year } = monthLabel(key);
              return (
                <Fragment key={key}>
                  <li className="sticky top-16 z-10 flex justify-start py-3 md:justify-center">
                    <span className="rounded-full border border-border bg-background px-4 py-1 text-sm font-medium">
                      {month} <span className="text-muted">· {year}</span>
                    </span>
                  </li>
                  {items.map((m) => {
                    const left = index++ % 2 === 0;
                    return (
                      <li
                        key={m.id}
                        id={`memory-${m.id}`}
                        className="reveal grid grid-cols-[1.25rem_1fr] gap-x-4 pb-6 md:grid-cols-[1fr_1.25rem_1fr] md:gap-x-6"
                      >
                        <span
                          aria-hidden
                          className="col-start-1 row-start-1 mt-7 size-3 justify-self-center rounded-full bg-accent ring-4 ring-background md:col-start-2"
                        />
                        <div className={`col-start-2 row-start-1 min-w-0 ${left ? "md:col-start-1" : "md:col-start-3"}`}>
                          <MemoryCard memory={m} justSaved={m.id === justSavedId} />
                        </div>
                      </li>
                    );
                  })}
                </Fragment>
              );
            })}
          </ol>
        )}

        {cursor && (
          <div className="flex justify-center">
            <Button variant="secondary" onPress={loadMore} isPending={loadingMore}>
              Xem thêm
            </Button>
          </div>
        )}
      </main>

      <MemoryFormModal spaceId={space.id} state={formState} onCreated={onCreated} />
    </div>
  );
}

export default function TimelinePage() {
  return (
    <Suspense>
      <Timeline />
    </Suspense>
  );
}
