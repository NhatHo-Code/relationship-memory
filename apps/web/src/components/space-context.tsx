"use client";

import { createContext, useContext } from "react";
import type { SpaceDetail } from "@/lib/api";

export const SpaceContext = createContext<SpaceDetail | null>(null);

export function useSpace() {
  const space = useContext(SpaceContext);
  if (!space) throw new Error("useSpace must be used inside a space layout");
  return space;
}
