"use client";

import { Button, Chip, Form, Label, Spinner, TextArea, TextField } from "@heroui/react";
import type { ChatResponse } from "@rm/shared";
import NextLink from "next/link";
import { useEffect, useRef, useState } from "react";
import { PaperclipIcon, PlusIcon, SendIcon, SparkIcon } from "@/components/icons";
import { useSpace } from "@/components/space-context";
import { ApiError, apiFetch } from "@/lib/api";
import { formatEventDate } from "@/lib/format";

type Turn =
  | { id: number; role: "user"; text: string }
  | { id: number; role: "assistant"; response: ChatResponse }
  | { id: number; role: "error"; text: string };

const suggestions = ["Buổi hẹn đầu tiên của tụi mình ở đâu?", "Tụi mình đã đi Đà Lạt khi nào?", "Có kỷ niệm nào về sinh nhật không?"];

export default function ChatPage() {
  const space = useSpace();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [question, setQuestion] = useState("");
  const [pending, setPending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(0);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns, pending]);

  async function ask(text: string) {
    const q = text.trim();
    if (!q || pending) return;
    setQuestion("");
    setTurns((t) => [...t, { id: nextId.current++, role: "user", text: q }]);
    setPending(true);
    try {
      const response = await apiFetch<ChatResponse>(`/v1/spaces/${space.id}/ai/chat`, {
        method: "POST",
        body: JSON.stringify({ question: q }),
      });
      setTurns((t) => [...t, { id: nextId.current++, role: "assistant", response }]);
    } catch (err) {
      const text =
        err instanceof ApiError && err.status === 429
          ? "Bạn hỏi hơi nhanh. Đợi khoảng một phút rồi hỏi tiếp nhé."
          : "AI đang gặp sự cố, chưa trả lời được. Thử lại sau ít phút.";
      setTurns((t) => [...t, { id: nextId.current++, role: "error", text }]);
    } finally {
      setPending(false);
    }
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    void ask(question);
  }

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-1">
        <h2 className="font-serif text-2xl font-semibold">Hỏi về câu chuyện của hai bạn</h2>
        <p className="text-sm text-muted">
          AI chỉ đọc những kỷ niệm bạn được xem: kỷ niệm chung và kỷ niệm riêng của chính bạn.
        </p>
      </div>

      <section aria-label="Cuộc trò chuyện" aria-live="polite" className="flex flex-col gap-4">
        {turns.length === 0 && (
          <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-border p-6">
            <p className="text-sm text-muted">Thử hỏi:</p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <Button key={s} variant="secondary" size="sm" onPress={() => void ask(s)}>
                  {s}
                </Button>
              ))}
            </div>
          </div>
        )}

        {turns.map((turn) => {
          if (turn.role === "user") {
            return (
              <p
                key={turn.id}
                className="max-w-[85%] self-end rounded-2xl rounded-br-md bg-accent px-4 py-2.5 text-accent-foreground"
              >
                {turn.text}
              </p>
            );
          }
          if (turn.role === "error") {
            return (
              <p key={turn.id} role="alert" className="rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger-soft-foreground">
                {turn.text}
              </p>
            );
          }
          const { response } = turn;
          if (!response.found) {
            return (
              <div key={turn.id} className="flex flex-col gap-3 rounded-2xl bg-surface-secondary px-5 py-4">
                <p className="font-medium">Không có thông tin</p>
                <p className="text-sm text-muted">
                  Mình chưa có thông tin này trong kỷ niệm của hai bạn. Bạn muốn thêm một kỷ niệm không?
                </p>
                <NextLink
                  href={`/spaces/${space.id}?new=1`}
                  className="inline-flex w-fit items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1.5 text-sm font-medium text-accent-soft-foreground hover:bg-accent-soft-hover"
                >
                  <PlusIcon width={14} height={14} />
                  Thêm kỷ niệm
                </NextLink>
              </div>
            );
          }
          return (
            <div key={turn.id} className="flex max-w-[92%] flex-col gap-3 rounded-2xl rounded-bl-md bg-surface px-5 py-4 shadow-sm">
              <p className="flex items-start gap-2">
                <SparkIcon width={16} height={16} className="mt-1 shrink-0 text-accent" />
                <span>{response.answer}</span>
              </p>
              {response.sources.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {response.sources.map((s) => (
                    <NextLink key={s.memoryId} href={`/spaces/${space.id}#memory-${s.memoryId}`}>
                      <Chip size="sm" variant="soft" className="cursor-pointer">
                        <PaperclipIcon width={12} height={12} />
                        {s.title} · {formatEventDate(s.eventDate)}
                      </Chip>
                    </NextLink>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {pending && (
          <p className="flex items-center gap-2 text-sm text-muted">
            <Spinner size="sm" />
            Đang tìm trong kỷ niệm…
          </p>
        )}
        <div ref={endRef} />
      </section>

      <Form onSubmit={onSubmit} className="sticky bottom-4 flex items-end gap-2 rounded-2xl border border-border bg-surface p-3 shadow-sm">
        <TextField name="question" value={question} onChange={setQuestion} className="flex-1">
          <Label className="sr-only">Câu hỏi</Label>
          <TextArea
            rows={1}
            maxLength={500}
            placeholder="Hỏi về một kỷ niệm…"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void ask(question);
              }
            }}
          />
        </TextField>
        <Button type="submit" isIconOnly aria-label="Gửi câu hỏi" isDisabled={!question.trim() || pending}>
          <SendIcon />
        </Button>
      </Form>
    </main>
  );
}
