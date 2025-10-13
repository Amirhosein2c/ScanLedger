"use client";

import * as React from "react";
import { cn } from "../../lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-xl border border-transparent bg-[#1F2937]/90 px-4 text-sm text-white placeholder:text-white/50 focus:border-[var(--primary-color)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]/40",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
