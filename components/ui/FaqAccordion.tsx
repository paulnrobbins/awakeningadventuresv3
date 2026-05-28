'use client';

import { useState, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

/**
 * AA-themed FAQ accordion. Smooth height animation via Framer Motion's
 * AnimatePresence + animated height — replaces the native <details>
 * element which snaps open/closed without easing.
 *
 * Sourced from 21st-dev's "Accordian" pattern (Plus/Minus icon toggle,
 * framer-motion height animation), then adapted to AA's palette and
 * brand:
 *   • Editorial Bricolage Grotesque for the question, Manrope for the
 *     body — same type pair as the rest of the site
 *   • Amber +/- icon that rotates smoothly between states
 *   • Cream/15 dividers between items, no boxed cards (matches the
 *     stripped-back editorial layout of the existing /faq page)
 *   • Spring easing on the icon morph so it feels hand-rotated, not
 *     mechanically interpolated
 */

export type FaqItem = {
  q: string;
  /** Either plain text or pre-rendered React nodes (for inline links etc) */
  a: ReactNode;
};

interface FaqAccordionProps {
  items: FaqItem[];
  /** Allow multiple items open at once (default false — single-open). */
  multiOpen?: boolean;
  className?: string;
}

export function FaqAccordion({ items, multiOpen = false, className }: FaqAccordionProps) {
  const [openIds, setOpenIds] = useState<Set<number>>(new Set());

  const toggle = (i: number) => {
    setOpenIds((prev) => {
      const next = new Set(multiOpen ? prev : []);
      if (prev.has(i)) {
        next.delete(i);
      } else {
        next.add(i);
      }
      return next;
    });
  };

  return (
    <ul
      className={cn(
        'divide-y divide-cream/15 border-t border-b border-cream/15 list-none m-0 p-0',
        className,
      )}
    >
      {items.map((item, i) => {
        const isOpen = openIds.has(i);
        return (
          <li key={i}>
            <button
              type="button"
              onClick={() => toggle(i)}
              aria-expanded={isOpen}
              aria-controls={`faq-panel-${i}`}
              className={cn(
                'w-full flex items-start justify-between gap-6',
                'py-6 text-left bg-transparent border-0 cursor-pointer',
                'font-display text-lede text-cream',
                'transition-colors duration-300 hover:text-amber',
                'focus:outline-none focus-visible:text-amber',
              )}
            >
              <span>{item.q}</span>

              {/* Animated +/− icon — single span morphs by rotating the
                  vertical bar away. Springy, feels hand-pushed. */}
              <span
                aria-hidden="true"
                className="shrink-0 mt-1 relative h-5 w-5 text-amber"
              >
                {/* Horizontal bar — always visible */}
                <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[2px] bg-amber rounded-full" />
                {/* Vertical bar — rotates to hide when open */}
                <motion.span
                  initial={false}
                  animate={{ rotate: isOpen ? 90 : 0, opacity: isOpen ? 0 : 1 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 28 }}
                  className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[2px] bg-amber rounded-full"
                  style={{ rotate: '90deg' }}
                />
              </span>
            </button>

            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  id={`faq-panel-${i}`}
                  role="region"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{
                    height: { duration: 0.32, ease: [0.16, 1, 0.3, 1] },
                    opacity: { duration: 0.22, delay: isOpen ? 0.08 : 0 },
                  }}
                  style={{ overflow: 'hidden' }}
                >
                  <div className="pb-6 pr-12 max-w-[60rem] font-sans text-body text-cream/85 leading-[1.62]">
                    {item.a}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </li>
        );
      })}
    </ul>
  );
}
