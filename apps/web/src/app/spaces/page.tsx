"use client";

import { Button, Card, Chip, FieldError, Form, Input, Label, Skeleton, TextField, toast } from "@heroui/react";
import { createSpaceSchema } from "@rm/shared";
import NextLink from "next/link";
import { useCallback, useEffect, useState } from "react";
import { PlusIcon } from "@/components/icons";
import { ApiError, apiFetch, type Space } from "@/lib/api";
import { useRequireSession } from "@/lib/use-session";

export default function SpacesPage() {
  const { session } = useRequireSession();
  const [spaces, setSpaces] = useState<Space[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(
    () =>
      apiFetch<Space[]>("/v1/spaces")
        .then(setSpaces)
        .catch(() =>
          setLoadError("Không tải được danh sách không gian. Kiểm tra API đang chạy rồi tải lại trang."),
        ),
    [],
  );

  useEffect(() => {
    if (!session) return;
    apiFetch<Space[]>("/v1/spaces")
      .then(setSpaces)
      .catch(() => setLoadError("Không tải được danh sách không gian. Kiểm tra API đang chạy rồi tải lại trang."));
  }, [session]);

  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = createSpaceSchema.safeParse({ name });
    if (!parsed.success) return setNameError("Tên cần từ 1 đến 100 ký tự.");
    setNameError(null);
    setCreating(true);
    try {
      await apiFetch<Space>("/v1/spaces", { method: "POST", body: JSON.stringify(parsed.data) });
      setName("");
      toast.success("Đã tạo không gian");
      await load();
    } catch (err) {
      toast.danger(err instanceof ApiError ? err.message : "Không tạo được không gian");
    } finally {
      setCreating(false);
    }
  }

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-10 px-4 py-12 sm:px-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-serif text-3xl font-semibold">Không gian của bạn</h1>
        <p className="text-muted">Mỗi không gian là album chung của hai người.</p>
      </div>

      <section aria-label="Danh sách không gian" className="flex flex-col gap-3">
        {loadError && (
          <p role="alert" className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger-soft-foreground">
            {loadError}
          </p>
        )}
        {!spaces && !loadError &&
          [0, 1].map((i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}
        {spaces?.length === 0 && (
          <Card variant="secondary">
            <Card.Content className="py-6 text-center text-muted">
              Bạn chưa có không gian nào. Tạo một không gian rồi mời người ấy vào.
            </Card.Content>
          </Card>
        )}
        {spaces?.map((s) => (
          <NextLink
            key={s.id}
            href={`/spaces/${s.id}`}
            className="group rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            <Card className="transition-colors group-hover:bg-surface-hover">
              <Card.Header className="flex-row items-center justify-between gap-4">
                <div>
                  <Card.Title className="font-serif text-xl">{s.name}</Card.Title>
                  <Card.Description>
                    Tạo ngày {new Date(s.createdAt).toLocaleDateString("vi-VN")}
                  </Card.Description>
                </div>
                <Chip size="sm" variant="soft" color={s.role === "owner" ? "accent" : "default"}>
                  {s.role === "owner" ? "Chủ không gian" : "Thành viên"}
                </Chip>
              </Card.Header>
            </Card>
          </NextLink>
        ))}
      </section>

      <Card variant="secondary">
        <Card.Header>
          <Card.Title>Tạo không gian mới</Card.Title>
          <Card.Description>Ví dụ: “Alice & Bob” hoặc “Nhà mình”.</Card.Description>
        </Card.Header>
        <Card.Content>
          <Form onSubmit={create} className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <TextField
              name="name"
              value={name}
              onChange={setName}
              isInvalid={nameError !== null}
              className="flex-1"
            >
              <Label>Tên không gian</Label>
              <Input placeholder="Alice & Bob" />
              <FieldError>{nameError}</FieldError>
            </TextField>
            <Button type="submit" isPending={creating} className="sm:mt-7">
              <PlusIcon />
              Tạo
            </Button>
          </Form>
        </Card.Content>
      </Card>
    </main>
  );
}
