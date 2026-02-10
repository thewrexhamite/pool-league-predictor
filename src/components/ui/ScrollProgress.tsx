'use client';

import { motion, useScroll, useSpring } from 'framer-motion';

/**
 * A thin, animated progress bar fixed to the top of the viewport
 * that shows how far the user has scrolled down the page.
 *
 * Renders both a pure-CSS scroll-driven version (hidden by default)
 * and a Framer Motion fallback. CSS @supports in globals.css toggles
 * which one is visible — browsers with animation-timeline: scroll()
 * get the CSS version, others keep the FM spring animation.
 */
export default function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 200,
    damping: 30,
    restDelta: 0.001,
  });

  return (
    <>
      {/* CSS scroll-driven version — hidden by default, shown via @supports in globals.css */}
      <div className="scroll-progress-css hidden" />

      {/* Framer Motion fallback — hidden when CSS version is active */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-[2px] z-[60] origin-left scroll-progress-fm-fallback"
        style={{
          scaleX,
          background: 'linear-gradient(90deg, rgb(var(--baize)), rgb(var(--accent)))',
        }}
      />
    </>
  );
}
