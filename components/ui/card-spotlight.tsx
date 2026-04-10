"use client";

import { useRef } from "react";
import type { MouseEvent } from "react";
import { cn } from "@/lib/cn";

type CardSpotlightProps = {
  children: React.ReactNode;
  className?: string;
  radius?: number;
  color?: string;
};

export function CardSpotlight({
  children,
  className,
  radius = 280,
  color = "var(--spotlight-color)",
}: CardSpotlightProps) {
  const ref = useRef<HTMLDivElement>(null);

  const updatePosition = (event: MouseEvent<HTMLDivElement>) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect || !ref.current) {
      return;
    }

    ref.current.style.setProperty("--spot-x", `${event.clientX - rect.left}px`);
    ref.current.style.setProperty("--spot-y", `${event.clientY - rect.top}px`);
    ref.current.style.setProperty("--spot-radius", `${radius}px`);
    ref.current.style.setProperty("--spot-color", color);
  };

  return (
    <div
      ref={ref}
      onMouseMove={updatePosition}
      className={cn(
        "spotlight-card spotlight-panel relative overflow-hidden rounded-[1.75rem] backdrop-blur-xl",
        className,
      )}
    >
      <div className="relative z-10">{children}</div>
    </div>
  );
}
