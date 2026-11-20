"use client";

import { Button, Card, FieldError, Form, Input, Label, TextField } from "@heroui/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { supabase } from "@/lib/supabase";
import { safeNext } from "@/lib/use-session";

function LoginForm() {
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState<"signin" | "signup" | null>(null);

  async function signIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending("signin");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setPending(null);
    if (error) return setError("Email hoặc mật khẩu không đúng.");
    router.replace(next);
  }

  async function signUp() {
    setError(null);
    setNotice(null);
    if (!email || password.length < 6) {
      return setError("Nhập email và mật khẩu từ 6 ký tự để đăng ký.");
    }
    setPending("signup");
    const { data, error } = await supabase.auth.signUp({ email, password });
    setPending(null);
    if (error) return setError(error.message);
    if (data.session) return router.replace(next);
    setNotice("Đã gửi email xác nhận. Mở email rồi đăng nhập lại.");
  }

  return (
    <Card className="w-full max-w-md">
      <Card.Header>
        <Card.Title className="font-serif text-2xl">Chào mừng trở lại</Card.Title>
        <Card.Description>Đăng nhập để mở album của hai bạn.</Card.Description>
      </Card.Header>
      <Card.Content>
        <Form onSubmit={signIn} className="flex flex-col gap-4">
          <TextField isRequired name="email" type="email" value={email} onChange={setEmail}>
            <Label>Email</Label>
            <Input autoComplete="email" placeholder="ban@vidu.com" />
            <FieldError>Nhập email hợp lệ.</FieldError>
          </TextField>
          <TextField isRequired name="password" type="password" value={password} onChange={setPassword}>
            <Label>Mật khẩu</Label>
            <Input autoComplete="current-password" />
            <FieldError>Nhập mật khẩu.</FieldError>
          </TextField>

          {error && (
            <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger-soft-foreground">
              {error}
            </p>
          )}
          {notice && (
            <p role="status" className="rounded-xl bg-success-soft px-3 py-2 text-sm text-success-soft-foreground">
              {notice}
            </p>
          )}

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="submit" fullWidth isPending={pending === "signin"} isDisabled={pending !== null}>
              Đăng nhập
            </Button>
            <Button
              variant="secondary"
              fullWidth
              onPress={signUp}
              isPending={pending === "signup"}
              isDisabled={pending !== null}
            >
              Đăng ký
            </Button>
          </div>
        </Form>
      </Card.Content>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <main className="flex justify-center px-4 py-16">
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
