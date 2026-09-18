import { Tooltip as TooltipPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

/**
 * Radix tooltip, styled.
 *
 * `skipDelayDuration` is the detail most implementations miss: the first
 * tooltip waits, and for a moment afterwards its neighbours open instantly.
 * The delay is there to stop a tooltip firing while the pointer is merely
 * crossing the room — once you have clearly stopped to read one, paying that
 * wait again for the button beside it makes the whole sidebar feel slow.
 */
function TooltipProvider({
  delayDuration = 400,
  skipDelayDuration = 300,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delayDuration={delayDuration}
      skipDelayDuration={skipDelayDuration}
      {...props}
    />
  );
}

function Tooltip(props: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  return <TooltipPrimitive.Root data-slot="tooltip" {...props} />;
}

function TooltipTrigger(
  props: React.ComponentProps<typeof TooltipPrimitive.Trigger>,
) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />;
}

function TooltipContent({
  className,
  sideOffset = 6,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        className={cn(
          "bg-popover text-popover-foreground border-border z-50 max-w-56 rounded-md border px-2 py-1 text-xs text-balance shadow-(--shadow-raised)",
          // Grow from the edge nearest the trigger, so the tooltip reads as
          // coming OUT of the button rather than appearing beside it.
          "origin-[var(--radix-tooltip-content-transform-origin)]",
          // Keyframes, not transitions, and that is Radix's requirement rather
          // than a preference: it keeps the element mounted for an exit only
          // while a CSS *animation* is running, and never notices a
          // transition. 150ms, ease-out, opacity + transform only.
          "animate-in fade-in-0 duration-150 ease-[var(--ease-out)]",
          "data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
          // The scale is the part reduced motion drops. The fade stays, so the
          // tooltip is still legibly arriving rather than blinking into place.
          "motion-safe:zoom-in-95 data-[state=closed]:motion-safe:zoom-out-95",
          className,
        )}
        {...props}
      >
        {children}
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  );
}

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger };
