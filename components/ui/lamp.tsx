import { cn } from "@/lib/cn";
import { Spotlight } from "@/components/ui/spotlight";

type LampSectionProps = {
  className?: string;
  children: React.ReactNode;
};

export function LampSection({ className, children }: LampSectionProps) {
  return (
    <section
      className={cn(
        "lamp-panel relative overflow-hidden rounded-[2rem] px-6 py-12 md:px-10 md:py-16",
        className,
      )}
    >
      <div className="lamp-panel-top-line pointer-events-none absolute inset-x-0 top-0 h-px" />
      <div className="lamp-panel-orb pointer-events-none absolute left-1/2 top-0 h-52 w-[36rem] -translate-x-1/2 rounded-full blur-3xl" />
      <div className="lamp-panel-beam pointer-events-none absolute left-1/2 top-0 h-64 w-[26rem] -translate-x-1/2 opacity-70 [clip-path:polygon(46%_0,54%_0,100%_100%,0_100%)]" />
      <Spotlight className="opacity-70" fill="var(--lamp-spotlight)" />
      <div className="lamp-panel-bottom-line pointer-events-none absolute inset-x-10 bottom-0 h-px" />
      <div className="relative z-10">{children}</div>
    </section>
  );
}
