import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

const cx = (...s) => s.filter(Boolean).join(" ");

export const TooltipProvider = TooltipPrimitive.Provider;
export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;

export const TooltipContent = React.forwardRef(
  ({ className, sideOffset = 4, ...props }, ref) => (
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cx(
        "z-[200] px-2 py-1.5 rounded-lg border border-white/15",
        "bg-zinc-950/80 backdrop-blur text-xs shadow-xl",
        className
      )}
      {...props}
    />
  )
);
TooltipContent.displayName = "TooltipContent";
