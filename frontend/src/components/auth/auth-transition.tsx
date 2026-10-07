"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

export function AuthTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div
      key={pathname}
      className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500 motion-safe:ease-out"
    >
      {children}
    </div>
  );
}