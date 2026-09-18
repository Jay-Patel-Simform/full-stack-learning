import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function Wordmark({
  className,
  size = "sm",
}: {
  className?: string;
  size?: "sm" | "lg";
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span
        aria-hidden
        className={cn(
          "grid place-content-center rounded-md bg-primary text-primary-foreground",
          size === "lg" ? "size-9" : "size-7",
        )}
      >
        <CheckCircle2 className={size === "lg" ? "size-5" : "size-4"} />
      </span>
      <span
        className={cn(
          "font-semibold tracking-[-0.015em]",
          size === "lg" ? "text-lg" : "text-[0.9375rem]",
        )}
      >
        Team Task Tracker
      </span>
    </div>
  );
}
