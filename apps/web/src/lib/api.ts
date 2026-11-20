import type { MemoryDto } from "@rm/shared";
import { supabase } from "./supabase";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });

  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(res.status, body.code ?? "UNKNOWN", body.message ?? "Request failed", body.details);
  }
  return body as T;
}

export interface Space {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  role: "owner" | "partner";
}

export interface SpaceMember {
  userId: string;
  role: "owner" | "partner";
  joinedAt: string;
  displayName: string | null;
}

export interface SpaceDetail extends Space {
  members: SpaceMember[];
}

export interface MemoryPage {
  items: MemoryDto[];
  nextCursor: string | null;
}

export interface Invitation {
  invitationId: string;
  token: string;
  expiresAt: string;
}
