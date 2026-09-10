"use client";

import React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { motion, useReducedMotion } from "motion/react";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onAnimationStart" | "onDragStart" | "onDragEnd" | "onDrag"> {
  variant?:
    | "primary"
    | "secondary"
    | "danger"
    | "ghost"
    | "outline"
    | "cyan"
    | "purple"
    | "shimmer";
  size?: "sm" | "md" | "lg" | "icon";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const shouldReduceMotion = useReducedMotion();

    const baseStyles =
      "relative inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer overflow-hidden";

    const variants = {
      primary:
        "bg-gradient-to-r from-[#f5c842] to-[#d4a017] hover:from-[#fde68a] hover:to-[#f5c842] text-[#080808] font-semibold shadow-lg shadow-yellow-500/20 hover:shadow-yellow-500/35 focus:ring-yellow-400",
      cyan: "bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 focus:ring-cyan-400",
      purple:
        "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 focus:ring-purple-400",
      secondary:
        "bg-[#141414] hover:bg-[#1a1a1a] text-[#c0c0c0] border border-[rgba(245,200,66,0.12)] hover:border-[rgba(245,200,66,0.25)] focus:ring-yellow-400/30",
      outline:
        "border border-[rgba(245,200,66,0.35)] text-[#c0a035] hover:bg-[rgba(245,200,66,0.08)] hover:border-[rgba(245,200,66,0.55)] hover:text-[#f5c842] focus:ring-yellow-400",
      ghost:
        "text-[#7a7a7a] hover:text-[#c0a035] hover:bg-[rgba(245,200,66,0.06)] focus:ring-yellow-400/30",
      danger:
        "bg-rose-600 hover:bg-rose-500 text-white font-semibold shadow-lg shadow-rose-600/25 focus:ring-rose-400",
      shimmer:
        "bg-gradient-to-r from-[#92692a] via-[#f5c842] to-[#92692a] bg-[length:200%_auto] text-[#080808] font-bold shadow-xl shadow-yellow-500/25 hover:shadow-yellow-500/40 focus:ring-yellow-400",
    };

    const sizes = {
      sm: "h-8 px-3 text-xs gap-1.5",
      md: "h-10 px-4 text-sm gap-2",
      lg: "h-12 px-6 text-base gap-2.5",
      icon: "h-10 w-10 p-0",
    };

    return (
      <motion.button
        ref={ref}
        disabled={disabled || isLoading}
        whileTap={
          disabled || isLoading || shouldReduceMotion
            ? undefined
            : { scale: 0.98, transition: { duration: 0.1 } }
        }
        whileHover={
          disabled || isLoading || shouldReduceMotion
            ? undefined
            : { scale: 1.01, transition: { duration: 0.15 } }
        }
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...(props as any)}
      >
        {/* Shimmer light effect overlay */}
        {variant === "shimmer" && (
          <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
        )}

        {isLoading ? (
          <span className="flex items-center gap-2">
            <svg
              className="animate-spin h-4 w-4 text-current"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <span>Đang xử lý...</span>
          </span>
        ) : (
          children
        )}
      </motion.button>
    );
  }
);
Button.displayName = "Button";
