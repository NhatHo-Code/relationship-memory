"use client";

import { Button, Card, toast } from "@heroui/react";
import { useState } from "react";
import { CopyIcon, UsersIcon } from "@/components/icons";
import { ApiError, apiFetch, type Invitation } from "@/lib/api";

export function InvitePanel({ spaceId }: { spaceId: string }) {
  const [link, setLink] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function createInvite() {
    setPending(true);
    try {
      const inv = await apiFetch<Invitation>(`/v1/spaces/${spaceId}/invitations`, { method: "POST" });
      setLink(`${location.origin}/invite?token=${encodeURIComponent(inv.token)}`);
      setExpiresAt(inv.expiresAt);
    } catch (err) {
      toast.danger(err instanceof ApiError && err.code === "SPACE_FULL" ? "Không gian đã đủ hai người." : "Không tạo được link mời.");
    } finally {
      setPending(false);
    }
  }

  async function copy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Đã sao chép link mời");
    } catch {
      toast.warning("Không sao chép được. Hãy chọn và copy link thủ công.");
    }
  }

  return (
    <Card variant="secondary">
      <Card.Header className="flex-row items-start gap-3">
        <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-soft-foreground">
          <UsersIcon width={18} height={18} />
        </span>
        <div>
          <Card.Title>Mời người ấy vào</Card.Title>
          <Card.Description>Không gian này mới có mình bạn. Gửi link mời để cùng viết.</Card.Description>
        </div>
      </Card.Header>
      <Card.Content className="flex flex-col gap-3">
        {link ? (
          <>
            <div className="flex gap-2">
              <input
                id="invite-link"
                readOnly
                value={link}
                aria-label="Link mời"
                onFocus={(e) => e.currentTarget.select()}
                className="min-w-0 flex-1 rounded-xl border border-border bg-field px-3 py-2 font-mono text-xs"
              />
              <Button variant="secondary" onPress={copy}>
                <CopyIcon />
                Sao chép
              </Button>
            </div>
            {expiresAt && (
              <p className="text-xs text-muted">
                Hết hạn lúc {new Date(expiresAt).toLocaleString("vi-VN")}. Link chỉ dùng được một lần.
              </p>
            )}
          </>
        ) : (
          <Button variant="primary" onPress={createInvite} isPending={pending} className="w-fit">
            Tạo link mời
          </Button>
        )}
      </Card.Content>
    </Card>
  );
}
