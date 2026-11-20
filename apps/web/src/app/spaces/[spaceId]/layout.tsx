import { Suspense, type ReactNode } from "react";
import { SpaceShell } from "@/components/space-shell";

export default function SpaceLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense>
      <SpaceShell>{children}</SpaceShell>
    </Suspense>
  );
}
