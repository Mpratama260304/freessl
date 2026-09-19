"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Slot as SlotPrimitive } from "radix-ui"

const glassButtonVariants = cva(
  cn(
    "button relative inline-flex items-center justify-center gap-2 rounded-lg cursor-pointer",
    "text-sm font-semibold transition-colors duration-150",
    "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-current",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  ),
  {
    variants: {
      variant: {
        default: "button-secondary",
        primary: "button-primary",
        outline: "button-secondary",
        ghost: "button-ghost",
        destructive: "button-danger",
      },
      size: {
        default: "min-h-11 px-4 py-2",
        sm: "min-h-11 px-3 text-sm",
        lg: "min-h-12 px-6 py-3 text-base",
        icon: "size-11 shrink-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

export interface GlassButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof glassButtonVariants> {
  glowEffect?: boolean,
  asChild?: boolean
}

const GlassButton = React.forwardRef<HTMLButtonElement, GlassButtonProps>(
  ({ className, variant, asChild = false, size, glowEffect = false, children, ...props }, ref) => {
    const Comp = asChild ? SlotPrimitive.Slot : "button"
    return (
      <Comp data-glow={glowEffect || undefined} className={cn(glassButtonVariants({ variant, size, className }))} ref={ref} {...props}>
        {children}
      </Comp>
    )
  },
)
GlassButton.displayName = "GlassButton"

export { GlassButton, glassButtonVariants }
