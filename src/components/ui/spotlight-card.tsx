"use client";

import React, { useRef, useState, useCallback } from "react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/components/ui/button";

interface SpotlightCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  spotlightColor?: string;
  className?: string;
  enableTilt?: boolean;
}

/**
 * SpotlightCard inspired by Motion Primitives & Linear:
 * - On desktop: Radial spotlight gradient follows mouse position
 * - Subtle border glow
 * - Mobile safe: skips pointer tracking, gracefully falls back to static glass
 * - Respects prefers-reduced-motion
 */
export function SpotlightCard({
  children,
  spotlightColor = "rgba(245, 200, 66, 0.10)",
  className,
  enableTilt = false,
  ...props
}: SpotlightCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null);
  const [tilt, setTilt] = useState<{ rotateX: number; rotateY: number }>({ rotateX: 0, rotateY: 0 });
  const shouldReduceMotion = useReducedMotion();

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (shouldReduceMotion || !cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setMousePosition({ x, y });

      if (enableTilt) {
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        // Max tilt of ±6 degrees for premium 3D feel
        const rotateX = ((y - centerY) / centerY) * -6;
        const rotateY = ((x - centerX) / centerX) * 6;
        setTilt({ rotateX, rotateY });
      }
    },
    [enableTilt, shouldReduceMotion]
  );

  const handleMouseLeave = useCallback(() => {
    setMousePosition(null);
    setTilt({ rotateX: 0, rotateY: 0 });
  }, []);

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      animate={
        enableTilt && !shouldReduceMotion
          ? {
              rotateX: tilt.rotateX,
              rotateY: tilt.rotateY,
              transformPerspective: 1000,
            }
          : undefined
      }
      whileHover={
        shouldReduceMotion
          ? undefined
          : {
              y: -3,
              transition: { duration: 0.25, ease: "easeOut" },
            }
      }
      className={cn(
        "relative rounded-2xl overflow-hidden glass-card p-6 transition-colors duration-300",
        "border border-[rgba(245,200,66,0.10)] hover:border-[rgba(245,200,66,0.28)]",
        className
      )}
      {...(props as any)}
    >
      {/* Dynamic Cursor Spotlight Overlay (Desktop only) */}
      {mousePosition && !shouldReduceMotion && (
        <div
          className="pointer-events-none absolute -inset-px opacity-100 transition-opacity duration-300 z-0"
          style={{
            background: `radial-gradient(400px circle at ${mousePosition.x}px ${mousePosition.y}px, ${spotlightColor}, transparent 80%)`,
          }}
        />
      )}

      {/* Card Content Container */}
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}
