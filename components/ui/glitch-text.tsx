import type { ElementType } from "react";
import { cn } from "@/lib/cn";

type GlitchTextProps<T extends ElementType> = {
  as?: T;
  className?: string;
  text: string;
};

export function GlitchText<T extends ElementType = "span">({
  as,
  className,
  text,
}: GlitchTextProps<T>) {
  const Tag = as ?? "span";

  return (
    <Tag className={cn("glitch-text", className)} data-text={text}>
      {text}
    </Tag>
  );
}
