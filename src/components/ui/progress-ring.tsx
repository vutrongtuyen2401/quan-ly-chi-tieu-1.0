"use client";

import React from "react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/components/ui/button";

interface ProgressRingProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  children?: React.ReactNode;
  showText?: boolean;
}

/**
 * ProgressRing inspired by shadcn-fintech:
 * Circular SVG progress ring with animated stroke and semantic glow
 */
export function ProgressRing({
  percentage,
  size = 80,
  strokeWidth = 6,
  className,
  children,
  showText = true,
}: ProgressRingProps) {
  const shouldReduceMotion = useReducedMotion();
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const clampedPercentage = Math.min(Math.max(percentage, 0), 100);
  const strokeDashoffset = circumference - (clampedPercentage / 100) * circumference;

  // Semantic color based on percentage
  const isOverLimit = percentage >= 100;
  const isNearLimit = percentage >= 80 && percentage < 100;

  const strokeColor = isOverLimit
    ? "#f43f5e" // Rose
    : isNearLimit
    ? "#f59e0b" // Amber
    : "#06b6d4"; // Cyan

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg
        width={size}
        height={size}
        className={cn(
          "transform -rotate-90",
          isNearLimit && "drop-shadow-[0_0_8px_rgba(245,158,11,0.35)]",
          isOverLimit && "drop-shadow-[0_0_8px_rgba(244,63,94,0.45)]"
        )}
      >
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#1e293b"
          strokeWidth={strokeWidth}
          fill="transparent"
        />

        {/* Animated progress ring */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={
            shouldReduceMotion
              ? { duration: 0 }
              : { duration: 1.2, ease: [0.16, 1, 0.3, 1] }
          }
          strokeLinecap="round"
          fill="transparent"
        />
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex items-center justify-center text-center">
        {children || (showText && (
          <span
            className={cn(
              "num-tabular font-bold text-xs",
              isOverLimit ? "text-rose-400" : isNearLimit ? "text-amber-400" : "text-slate-200"
            )}
          >
            {Math.round(percentage)}%
          </span>
        ))}
      </div>
    </div>
  );
}
