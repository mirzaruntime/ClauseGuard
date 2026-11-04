import * as ToastPrimitive from '@radix-ui/react-toast';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { useToastStore, type ToastTone } from '@/store/toast.store';
import { cn } from '@/lib/utils';

const ICONS: Record<ToastTone, React.ComponentType<{ className?: string }>> = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
};

const TONE_STYLES: Record<ToastTone, string> = {
  success: 'border-[var(--color-success)]/30 [&_svg]:text-[var(--color-success)]',
  error: 'border-[var(--color-danger)]/30 [&_svg]:text-[var(--color-danger)]',
  info: 'border-[var(--color-info)]/30 [&_svg]:text-[var(--color-info)]',
};

export function Toaster() {
  const shouldReduceMotion = useReducedMotion();
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <ToastPrimitive.Provider swipeDirection="right" duration={5000}>
      <AnimatePresence>
        {toasts.map((t) => {
          const Icon = ICONS[t.tone];
          return (
            <ToastPrimitive.Root
              key={t.id}
              forceMount
              onOpenChange={(open) => !open && dismiss(t.id)}
              asChild
            >
              <motion.div
                initial={shouldReduceMotion ? false : { opacity: 0, y: -8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
                transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.18 }}
                className={cn(
                  'flex w-full items-start gap-3 rounded-[var(--radius-md)] border bg-[var(--color-surface)] p-4 shadow-[var(--shadow-lg)]',
                  TONE_STYLES[t.tone],
                )}
              >
                <Icon className="mt-0.5 h-5 w-5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <ToastPrimitive.Title className="text-sm font-semibold text-[var(--color-text-primary)]">
                    {t.title}
                  </ToastPrimitive.Title>
                  {t.description && (
                    <ToastPrimitive.Description className="mt-0.5 text-sm text-[var(--color-text-muted)]">
                      {t.description}
                    </ToastPrimitive.Description>
                  )}
                </div>
                <ToastPrimitive.Close className="text-[var(--color-text-faint)] hover:text-[var(--color-text)]" aria-label="Dismiss">
                  <X className="h-4 w-4" />
                </ToastPrimitive.Close>
              </motion.div>
            </ToastPrimitive.Root>
          );
        })}
      </AnimatePresence>
      <ToastPrimitive.Viewport className="fixed top-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2 outline-none" />
    </ToastPrimitive.Provider>
  );
}
