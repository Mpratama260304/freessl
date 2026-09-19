"use client"

import type * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const glassBadgeVariants = cva(
  cn(
    "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
    "backdrop-blur-xl border transition-all duration-300",
  ),
  {
    variants: {
      variant: {
        default: "badge-neutral",
        primary: "badge-success",
        success: "badge-success",
        warning: "badge-warning",
        destructive: "badge-error",
        outline: "badge-neutral",
      },
      size: {
        sm: "px-2 py-0.5 text-xs",
        md: "px-3 py-1 text-sm",
        lg: "px-4 py-2 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  },
)

export interface GlassBadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof glassBadgeVariants> {}

function GlassBadge({ className, variant, size, ...props }: GlassBadgeProps) {
  return <div className={cn(glassBadgeVariants({ variant, size }), className)} {...props} />
}

export { GlassBadge, glassBadgeVariants }
