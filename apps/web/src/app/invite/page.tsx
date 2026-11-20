"use client";

import { Button, Card, buttonVariants } from "@heroui/react";
import NextLink from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { UsersIcon } from "@/components/icons";
import { ApiError, apiFetch } from "@/lib/api";
import { useRequireSession } from "@/lib/use-session";

const errorText: Record<string, string> = {
  INVITATION_EXPIRED: "Lời mời đã hết hạn. Nhờ người mời tạo link mới.",
  INVITATION_INVALID: "Lời mời này đã được dùng hoặc đã bị thu hồi.",
  INVITATION_NOT_FOUND: "Link mời không đúng. Kiểm tra lại link bạn nhận được.",
  SPACE_FULL: "Không gian này đã đủ hai người.",
  ALREADY_MEMBER: "Bạn đã ở trong không gian này rồi.",
};

function Invite() {
  const router = useRouter();
  const token = useSearchParams().get("token");
  const { session, loading } = useRequireSession(`/invite?token=${encodeURIComponent(token ?? "")}`);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function accept() {
    if (!token) return;
    setPending(true);
    setError(null);
    try {
      const res = await apiFetch<{ spaceId: string }>("/v1/invitations/accept", {
        method: "POST",
        body: JSON.stringify({ token }),
      });
      router.replace(`/spaces/${res.spaceId}`);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? (errorText[err.code] ?? (err.status === 400 ? errorText.INVITATION_NOT_FOUND! : "Không nhận được lời mời. Thử lại sau."))
          : "Không nhận được lời mời. Thử lại sau.",
      );
      setPending(false);
    }
  }

  if (loading || !session) return null;

  return (
    <Card className="w-full max-w-md">
      <Card.Header className="items-center text-center">
        <span className="mb-2 inline-flex size-12 items-center justify-center rounded-full bg-accent-soft text-accent-soft-foreground">
          <UsersIcon width={22} height={22} />
        </span>
        <Card.Title className="font-serif text-2xl">Bạn được mời vào một không gian chung</Card.Title>
        <Card.Description>
          Chấp nhận để cùng lưu kỷ niệm. Kỷ niệm bạn đánh dấu riêng tư vẫn chỉ mình bạn thấy.
        </Card.Description>
      </Card.Header>
      <Card.Content className="flex flex-col gap-3">
        {!token ? (
          <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger-soft-foreground">
            Link mời thiếu mã. Mở lại đúng link bạn nhận được.
          </p>
        ) : (
          <>
            {error && (
              <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger-soft-foreground">
                {error}
              </p>
            )}
            <Button fullWidth size="lg" onPress={accept} isPending={pending}>
              Chấp nhận lời mời
            </Button>
          </>
        )}
        <NextLink href="/spaces" className={buttonVariants({ variant: "ghost", fullWidth: true })}>
          Về danh sách không gian
        </NextLink>
      </Card.Content>
    </Card>
  );
}

export default function InvitePage() {
  return (
    <main className="flex justify-center px-4 py-16">
      <Suspense>
        <Invite />
      </Suspense>
    </main>
  );
}
