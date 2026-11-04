import type { ReactNode } from 'react';
import { motion, useReducedMotion, type Variants } from 'motion/react';
import { cn } from '@/lib/utils';

/**
 * Enterprise motion primitives adhering to ClauseGuard UX Motion Guidelines:
 * - Subtle, snappy transitions (180ms - 320ms)
 * - Coordinated page choreography: Page -> Header -> Content -> Details
 * - Respects prefers-reduced-motion unconditionally
 * - Prevents layout thrashing by animating only transform and opacity
 */

export function PageTransition({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const shouldReduceMotion = useReducedMotion();

  const variants: Variants = shouldReduceMotion
    ? { initial: { opacity: 1, y: 0 }, animate: { opacity: 1, y: 0 } }
    : {
        initial: { opacity: 0, y: 8 },
        animate: {
          opacity: 1,
          y: 0,
          transition: {
            duration: 0.28,
            ease: [0.16, 1, 0.3, 1],
          },
        },
      };

  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={variants}
      className={cn('w-full', className)}
    >
      {children}
    </motion.div>
  );
}

export function PageHeaderReveal({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const shouldReduceMotion = useReducedMotion();

  const variants: Variants = shouldReduceMotion
    ? { initial: { opacity: 1, y: 0 }, animate: { opacity: 1, y: 0 } }
    : {
        initial: { opacity: 0, y: 6 },
        animate: {
          opacity: 1,
          y: 0,
          transition: {
            duration: 0.22,
            delay: 0.04,
            ease: [0.16, 1, 0.3, 1],
          },
        },
      };

  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={variants}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function FadeUp({
  children,
  delay = 0,
  duration = 0.24,
  className,
}: {
  children: ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
}) {
  const shouldReduceMotion = useReducedMotion();

  const variants: Variants = shouldReduceMotion
    ? { initial: { opacity: 1, y: 0 }, animate: { opacity: 1, y: 0 } }
    : {
        initial: { opacity: 0, y: 8 },
        animate: {
          opacity: 1,
          y: 0,
          transition: {
            duration,
            delay,
            ease: [0.16, 1, 0.3, 1],
          },
        },
      };

  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={variants}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerContainer({
  children,
  staggerDelay = 0.045,
  delayChildren = 0.06,
  className,
}: {
  children: ReactNode;
  staggerDelay?: number;
  delayChildren?: number;
  className?: string;
}) {
  const shouldReduceMotion = useReducedMotion();

  const variants: Variants = shouldReduceMotion
    ? { initial: { opacity: 1 }, animate: { opacity: 1 } }
    : {
        initial: { opacity: 0 },
        animate: {
          opacity: 1,
          transition: {
            staggerChildren: staggerDelay,
            delayChildren,
          },
        },
      };

  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={variants}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const shouldReduceMotion = useReducedMotion();

  const variants: Variants = shouldReduceMotion
    ? { initial: { opacity: 1, y: 0 }, animate: { opacity: 1, y: 0 } }
    : {
        initial: { opacity: 0, y: 8 },
        animate: {
          opacity: 1,
          y: 0,
          transition: {
            duration: 0.22,
            ease: [0.16, 1, 0.3, 1],
          },
        },
      };

  return (
    <motion.div variants={variants} className={className}>
      {children}
    </motion.div>
  );
}

export function SectionReveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const shouldReduceMotion = useReducedMotion();

  const variants: Variants = shouldReduceMotion
    ? { hidden: { opacity: 1, y: 0 }, visible: { opacity: 1, y: 0 } }
    : {
        hidden: { opacity: 0, y: 12 },
        visible: {
          opacity: 1,
          y: 0,
          transition: {
            duration: 0.26,
            delay,
            ease: [0.16, 1, 0.3, 1],
          },
        },
      };

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-24px' }}
      variants={variants}
      className={className}
    >
      {children}
    </motion.div>
  );
}
