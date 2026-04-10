import { cn } from "@/lib/cn";

export function BentoGrid({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={cn("grid gap-4 md:grid-cols-6", className)}>{children}</div>;
}

export function BentoCard({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "bento-panel group relative overflow-hidden rounded-[1.75rem] p-5 shadow-[var(--surface-shadow)] backdrop-blur-xl transition duration-300 hover:-translate-y-1",
        className,
      )}
    >
      <div className="relative z-10">{children}</div>
    </div>
  );
}
