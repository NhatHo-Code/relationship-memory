import { Card, Chip } from "@heroui/react";
import type { MemoryDto } from "@rm/shared";
import { LockIcon } from "@/components/icons";
import { formatEventDate } from "@/lib/format";

export function MemoryCard({ memory, justSaved }: { memory: MemoryDto; justSaved?: boolean }) {
  const isPrivate = memory.visibility === "private";

  return (
    <Card
      className={`memory-card ${justSaved ? "just-saved" : ""} ${
        isPrivate ? "border border-dashed border-border bg-surface-secondary" : ""
      }`}
    >
      <Card.Header className="gap-1">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
          <time dateTime={memory.eventDate}>{formatEventDate(memory.eventDate, memory.datePrecision)}</time>
          {memory.aiStatus === "pending" && (
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden className="size-1.5 animate-pulse rounded-full bg-warning" />
              Đang xử lý AI…
            </span>
          )}
          {memory.aiStatus === "failed" && (
            <Chip size="sm" color="danger" variant="soft">
              AI chưa đọc được kỷ niệm này
            </Chip>
          )}
        </div>
        <Card.Title className="font-serif text-xl leading-snug">{memory.title}</Card.Title>
      </Card.Header>
      <Card.Content className="flex flex-col gap-3">
        {memory.body && <p className="prose-story line-clamp-2 text-muted">{memory.body}</p>}
        {(isPrivate || memory.tags.length > 0) && (
          <div className="flex flex-wrap gap-1.5">
            {isPrivate && (
              <Chip size="sm" variant="soft" color="accent">
                <LockIcon width={12} height={12} />
                Chỉ mình bạn thấy
              </Chip>
            )}
            {memory.tags.map((tag) => (
              <Chip key={tag} size="sm" variant="secondary">
                {tag}
              </Chip>
            ))}
          </div>
        )}
      </Card.Content>
    </Card>
  );
}
