'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { REVIEWS, type Review } from '@/content/reviews';
import { cn } from '@/lib/utils';

/**
 * Testimonials marquee — three vertical columns of guest reviews
 * scrolling upward continuously at slightly different speeds, with a
 * soft top/bottom mask so cards drift in and out instead of popping.
 *
 * Sourced from 21st-dev's "Testimonials-v2" pattern (continuous vertical
 * marquee), then adapted to:
 *   • AA palette — translucent forest-ink cards with cream type and an
 *     amber stay-label, instead of the original neutral grays
 *   • Bricolage Grotesque (display) + Manrope (body) — same type pair
 *     as the rest of the site, no neutral-Inter look
 *   • Real review data from content/reviews.ts (no avatars — AA has no
 *     guest photos, so we lean on the lodging name + author)
 *   • Slower scroll cycles (28-36s vs the source's 15-19s) to match
 *     the contemplative pace of the AA brand
 *   • Hover lift via framer-motion's spring physics
 *
 * Replaces the old ReviewMarquee on SceneGroups while keeping that
 * component file present (legacy import, can be deleted later).
 *
 * Uses framer-motion (added to package.json line 19). Will work
 * after `npm install` lands the package on your Mac.
 */

type Column = Review[];

/**
 * Split the reviews into three balanced columns. Each column keeps a
 * mix of stay types (Stargazer/Driftwood/etc.) so the columns don't
 * end up homogeneous after the alphabetical sort. The source array
 * order is already a mix; we just stride 3-wise.
 */
function splitIntoColumns(items: Review[]): [Column, Column, Column] {
  const a: Column = [];
  const b: Column = [];
  const c: Column = [];
  items.forEach((r, i) => {
    if (i % 3 === 0) a.push(r);
    else if (i % 3 === 1) b.push(r);
    else c.push(r);
  });
  return [a, b, c];
}

interface TestimonialsMarqueeProps {
  /** Reviews override. Defaults to the full REVIEWS list. */
  reviews?: Review[];
  /** Max card width per column. */
  cardMaxWidth?: string;
  /** Class to forward to the outer section. */
  className?: string;
}

export function TestimonialsMarquee({
  reviews = REVIEWS,
  cardMaxWidth = 'max-w-xs',
  className,
}: TestimonialsMarqueeProps) {
  const [col1, col2, col3] = useMemo(() => splitIntoColumns(reviews), [reviews]);

  return (
    <section
      aria-label="Guest testimonials"
      className={cn(
        'relative w-full overflow-hidden',
        // Soft top + bottom fade so cards drift into and out of view
        // rather than appearing/clipping abruptly.
        '[mask-image:linear-gradient(to_bottom,transparent,black_8%,black_92%,transparent)]',
        // Cap the visible window so the page isn't 5000px tall on
        // mobile. 720px on desktop, smaller on mobile to keep the
        // section visually anchored.
        'max-h-[80vh] md:max-h-[640px] lg:max-h-[720px]',
        className,
      )}
    >
      <div className="flex justify-center gap-5 md:gap-6">
        <TestimonialColumn
          reviews={col1}
          duration={28}
          cardMaxWidth={cardMaxWidth}
        />
        <TestimonialColumn
          reviews={col2}
          duration={36}
          cardMaxWidth={cardMaxWidth}
          className="hidden md:block"
        />
        <TestimonialColumn
          reviews={col3}
          duration={32}
          cardMaxWidth={cardMaxWidth}
          className="hidden lg:block"
        />
      </div>
    </section>
  );
}

interface TestimonialColumnProps {
  reviews: Review[];
  duration: number;
  cardMaxWidth: string;
  className?: string;
}

function TestimonialColumn({
  reviews,
  duration,
  cardMaxWidth,
  className,
}: TestimonialColumnProps) {
  return (
    <div className={className}>
      <motion.ul
        animate={{ translateY: '-50%' }}
        transition={{
          duration,
          repeat: Infinity,
          ease: 'linear',
          repeatType: 'loop',
        }}
        className="flex flex-col gap-5 m-0 p-0 list-none"
      >
        {/* Duplicate the set so the loop is seamless. The translate-Y
            animates from 0 to -50% (the height of one full copy), then
            wraps back to 0 — visitor never sees the seam. */}
        {[0, 1].map((dupeIdx) => (
          <React.Fragment key={dupeIdx}>
            {reviews.map((r, i) => (
              <TestimonialCard
                key={`${dupeIdx}-${i}`}
                review={r}
                ariaHidden={dupeIdx === 1}
                cardMaxWidth={cardMaxWidth}
              />
            ))}
          </React.Fragment>
        ))}
      </motion.ul>
    </div>
  );
}

interface TestimonialCardProps {
  review: Review;
  ariaHidden: boolean;
  cardMaxWidth: string;
}

function TestimonialCard({ review, ariaHidden, cardMaxWidth }: TestimonialCardProps) {
  return (
    <motion.li
      aria-hidden={ariaHidden}
      tabIndex={ariaHidden ? -1 : 0}
      whileHover={{
        y: -6,
        scale: 1.015,
        transition: { type: 'spring', stiffness: 380, damping: 22 },
      }}
      whileFocus={{
        y: -6,
        scale: 1.015,
        transition: { type: 'spring', stiffness: 380, damping: 22 },
      }}
      className={cn(
        'group select-none cursor-default',
        'rounded-2xl p-7 md:p-8',
        'border border-cream/20',
        // Translucent forest-ink card so the 3D world reads behind.
        // 0.22 opacity matches the home-card-warm variant on Groups
        // for visual continuity with the rest of the section.
        'bg-[rgba(31,46,31,0.22)]',
        'backdrop-blur-[2px]',
        'shadow-[0_8px_24px_-8px_rgba(0,0,0,0.18)]',
        'transition-shadow duration-300 hover:shadow-[0_18px_40px_-12px_rgba(0,0,0,0.28)]',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-amber/60',
        cardMaxWidth,
        'w-full',
      )}
    >
      <blockquote className="m-0 p-0">
        {/* Stay tag — small amber eyebrow tying the quote to a place */}
        <p className="font-sans text-[0.62rem] tracking-[0.18em] uppercase text-amber font-medium m-0 mb-3">
          {review.stay}
        </p>

        {/* The quote itself. Cap at ~32 words visible — anything longer
            stays readable but we lean editorial, not novel-length. */}
        <p className="font-sans text-[0.95rem] leading-[1.55] text-cream m-0">
          {review.body}
        </p>

        <footer className="mt-5 flex items-center gap-2">
          <span aria-hidden className="h-px w-6 bg-cream/30" />
          <cite className="not-italic font-display text-[0.95rem] leading-none text-cream/90">
            {review.author}
          </cite>
        </footer>
      </blockquote>
    </motion.li>
  );
}
