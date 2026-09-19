"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface GlassInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  glowOnFocus?: boolean
}

const GlassInput = React.forwardRef<HTMLInputElement, GlassInputProps>(
  ({ className, type, glowOnFocus = false, ...props }, ref) => {
    return (
      <div className="field-shell relative group">
        {glowOnFocus && (
          <div className="input-focus-halo" />
        )}
        <input
          type={type}
          className={cn(
            "glass-input relative flex min-h-12 w-full rounded-lg px-4 py-3 text-base",
            "transition-colors duration-150",
            "disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
          ref={ref}
          {...props}
        />
      </div>
    )
  },
)
GlassInput.displayName = "GlassInput"

export { GlassInput }
