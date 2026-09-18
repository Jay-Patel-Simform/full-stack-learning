import { cn } from "@/lib/utils";

/**
 * The shape of the thing that is coming. A list gets rows the size of its
 * rows, not a spinner — the page keeps its layout, so nothing jumps when the
 * answer lands.
 */
export function Skeleton({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return <div className={cn("skeleton", className)} {...props} />;
}

/**
 * `aria-busy` and one polite label, so a screen reader hears "loading" once
 * instead of hearing nothing at all — the bars themselves say nothing.
 */
export function SkeletonList({
  rows = 4,
  label,
  className,
}: {
  rows?: number;
  label: string;
  className?: string;
}) {
  // Widths vary a little so the block reads as text, not as a table.
  const widths = ["78%", "56%", "67%", "45%", "72%", "60%"];

  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-label={label}
      className={cn("grid gap-px", className)}
    >
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-3">
          <Skeleton className="size-4 rounded-[4px]" />
          <Skeleton
            className="h-3.5"
            style={{ width: widths[i % widths.length] }}
          />
        </div>
      ))}
    </div>
  );
}
