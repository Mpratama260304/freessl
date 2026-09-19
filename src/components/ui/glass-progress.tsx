"use client"

import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"
import { cn } from "@/lib/utils"

const GlassProgress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, ...props }, ref) => (
  <div className="relative">
    <ProgressPrimitive.Root
      ref={ref}
      value={value}
      className={cn(
        "progress-track relative h-1.5 w-full overflow-hidden rounded-full",
        className,
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className={cn(
          "progress-fill h-full transition-all duration-300 ease-out rounded-full",
        )}
        style={{ width: `${value || 0}%` }}
      />
    </ProgressPrimitive.Root>
  </div>
))
GlassProgress.displayName = ProgressPrimitive.Root.displayName

export { GlassProgress }
