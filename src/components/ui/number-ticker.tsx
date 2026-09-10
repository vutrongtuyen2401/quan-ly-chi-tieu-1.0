"use client";

import React, { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { formatVND } from "@/lib/formatters";

interface NumberTickerProps {
  value: number;
  direction?: "up" | "down";
  delay?: number;
  duration?: number;
  isCurrency?: boolean;
  className?: string;
  prefix?: string;
  suffix?: string;
}

/**
 * NumberTicker inspired by Magic UI:
 * Smoothly interpolates numeric values on mount or value change
 * Displays in tabular format to prevent layout jumps
 */
export function NumberTicker({
  value,
  direction = "up",
  delay = 0,
  duration = 1.0,
  isCurrency = false,
  className = "",
  prefix = "",
  suffix = "",
}: NumberTickerProps) {
  const shouldReduceMotion = useReducedMotion();
  const [displayValue, setDisplayValue] = useState<number>(shouldReduceMotion ? value : 0);
  const startTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (shouldReduceMotion) {
      setDisplayValue(value);
      return;
    }

    const startValue = direction === "down" ? value * 1.5 : 0;
    const targetValue = value;
    const durationMs = duration * 1000;

    const timeout = setTimeout(() => {
      const step = (timestamp: number) => {
        if (!startTimeRef.current) startTimeRef.current = timestamp;
        const progress = Math.min((timestamp - startTimeRef.current) / durationMs, 1);

        // Ease out expo for snappy luxury feel
        const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
        const current = startValue + (targetValue - startValue) * easeProgress;
        setDisplayValue(Math.round(current));

        if (progress < 1) {
          rafRef.current = requestAnimationFrame(step);
        } else {
          setDisplayValue(targetValue);
        }
      };

      rafRef.current = requestAnimationFrame(step);
    }, delay * 1000);

    return () => {
      clearTimeout(timeout);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      startTimeRef.current = null;
    };
  }, [value, direction, delay, duration, shouldReduceMotion]);

  const formatted = isCurrency
    ? formatVND(displayValue)
    : displayValue.toLocaleString("vi-VN");

  return (
    <span className={`inline-block num-tabular font-bold tracking-tight ${className}`}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
