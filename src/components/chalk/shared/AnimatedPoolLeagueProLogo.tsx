'use client';

import { motion } from 'framer-motion';
import { ListOrdered, BarChart3, Smartphone } from 'lucide-react';

const APP_DOWNLOAD_URL = 'https://pool-league-predictor-1--pool-league-predictor.us-east4.hosted.app/';

interface AnimatedPoolLeagueProLogoProps {
  vmin: number;
}

// --- Trophy SVG stroke paths (same geometry as TrophyLogo, rendered as strokes) ---

function AnimatedTrophy({ size }: { size: number }) {
  const strokeColor = '#D4A855';
  const strokeWidth = 4;

  // All trophy paths — we draw them as strokes first, then fade in the fill
  const paths = [
    // Left handle
    'M155 110 C80 110 60 190 140 220 L155 220 L155 200 C100 195 95 130 155 130 Z',
    // Right handle
    'M357 110 C432 110 452 190 372 220 L357 220 L357 200 C412 195 417 130 357 130 Z',
    // Cup body
    'M150 90 L362 90 L340 240 C330 280 290 310 256 320 C222 310 182 280 172 240 Z',
  ];

  // Rectangles for the stem/base
  const rects = [
    { x: 236, y: 315, w: 40, h: 40, rx: 4 },
    { x: 196, y: 350, w: 120, h: 18, rx: 9 },
    { x: 176, y: 365, w: 160, h: 22, rx: 11 },
  ];

  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 512 512">
      {/* Stroke draw-on layer */}
      {paths.map((d, i) => (
        <motion.path
          key={`stroke-${i}`}
          d={d}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{
            duration: 0.8,
            delay: i * 0.2,
            ease: 'easeInOut',
          }}
        />
      ))}

      {/* Stem/base stroke rectangles */}
      {rects.map((r, i) => (
        <motion.rect
          key={`rect-stroke-${i}`}
          x={r.x}
          y={r.y}
          width={r.w}
          height={r.h}
          rx={r.rx}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{
            duration: 0.5,
            delay: 0.6 + i * 0.12,
            ease: 'easeInOut',
          }}
        />
      ))}

      {/* Fill layer — fades in after stroke completes */}
      <motion.g
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 1.0 }}
      >
        {paths.map((d, i) => (
          <path key={`fill-${i}`} d={d} fill={strokeColor} />
        ))}
        {/* White highlight */}
        <path
          d="M192 115 L194 210 C198 255 228 285 256 295"
          fill="none"
          stroke="white"
          strokeWidth="10"
          strokeLinecap="round"
          strokeOpacity="0.2"
        />
        {rects.map((r, i) => (
          <rect
            key={`fill-rect-${i}`}
            x={r.x}
            y={r.y}
            width={r.w}
            height={r.h}
            rx={r.rx}
            fill={strokeColor}
          />
        ))}
      </motion.g>
    </svg>
  );
}

// --- Typewriter tagline ---

const taglineText = 'The smart way to manage your pool table';

function TypewriterTagline({ delay }: { delay: number }) {
  return (
    <motion.p
      className="text-[2.5vmin] text-gray-400"
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: {
          transition: { staggerChildren: 0.03, delayChildren: delay },
        },
      }}
    >
      {taglineText.split('').map((char, i) => (
        <motion.span
          key={i}
          style={{ display: 'inline-block', ...(char === ' ' ? { width: '0.3em' } : {}) }}
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { duration: 0.05 } },
          }}
        >
          {char === ' ' ? '\u00A0' : char}
        </motion.span>
      ))}
    </motion.p>
  );
}

// --- Feature pills ---

const features = [
  { icon: ListOrdered, label: 'Fair Queues' },
  { icon: BarChart3, label: 'Live Stats' },
  { icon: Smartphone, label: 'Play From Your Phone' },
];

function AnimatedFeaturePills({ vmin, delay }: { vmin: number; delay: number }) {
  return (
    <motion.div
      className="flex items-stretch gap-[2.5vmin] mt-[1vmin]"
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: {
          transition: { staggerChildren: 0.1, delayChildren: delay },
        },
      }}
    >
      {features.map(({ icon: Icon, label }) => (
        <motion.div
          key={label}
          className="flex flex-col items-center gap-[1vmin] rounded-[1.5vmin] bg-surface-card/60 border border-surface-border px-[2.5vmin] py-[2vmin]"
          variants={{
            hidden: { opacity: 0, y: 20 },
            visible: {
              opacity: 1,
              y: 0,
              transition: { duration: 0.4, ease: 'easeOut' },
            },
          }}
        >
          <Icon size={Math.round(vmin * 3.5)} className="text-baize" />
          <span className="text-[1.7vmin] font-medium text-gray-300">{label}</span>
        </motion.div>
      ))}
    </motion.div>
  );
}

// --- Main component ---

export function AnimatedPoolLeagueProLogo({ vmin }: AnimatedPoolLeagueProLogoProps) {
  const qrSize = Math.round(Math.max(80, Math.min(300, vmin * 18)));
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${qrSize}x${qrSize}&data=${encodeURIComponent(APP_DOWNLOAD_URL)}&bgcolor=FFFFFF&color=0C1222&format=svg`;

  // Timing anchors (seconds)
  const trophyDone = 1.3;
  const wordmarkStart = trophyDone;
  const wordmarkDone = wordmarkStart + 0.7;
  const taglineStart = wordmarkDone;
  const taglineDone = taglineStart + taglineText.length * 0.03 + 0.1;
  const pillsStart = taglineStart + 0.3; // overlap a bit
  const qrStart = pillsStart + 0.5;

  return (
    <div className="relative z-10 flex-1 flex flex-col items-center justify-center gap-[3vmin]">
      {/* Trophy logo — stroke draw-on + fill reveal */}
      <AnimatedTrophy size={Math.round(vmin * 14)} />

      {/* Wordmark — staggered word reveal */}
      <motion.h2
        className="text-[5vmin] font-bold tracking-tight"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: {
            transition: { staggerChildren: 0.15, delayChildren: wordmarkStart },
          },
        }}
      >
        {['Pool', ' ', 'League', ' '].map((word, i) => (
          <motion.span
            key={i}
            style={{ display: 'inline-block', ...(word === ' ' ? { width: '0.3em' } : {}) }}
            variants={{
              hidden: { opacity: 0, y: 15 },
              visible: {
                opacity: 1,
                y: 0,
                transition: { duration: 0.35, ease: 'easeOut' },
              },
            }}
          >
            {word === ' ' ? '\u00A0' : word}
          </motion.span>
        ))}
        {/* "Pro" with accent color pop + scale overshoot */}
        <motion.span
          className="text-accent"
          style={{ display: 'inline-block' }}
          variants={{
            hidden: { opacity: 0, y: 15, scale: 0.7 },
            visible: {
              opacity: 1,
              y: 0,
              scale: 1,
              transition: {
                duration: 0.45,
                ease: 'easeOut',
                scale: {
                  type: 'spring',
                  stiffness: 300,
                  damping: 12,
                },
              },
            },
          }}
        >
          Pro
        </motion.span>
      </motion.h2>

      {/* Tagline — typewriter effect */}
      <TypewriterTagline delay={taglineStart} />

      {/* Feature pills — cascade up */}
      <AnimatedFeaturePills vmin={vmin} delay={pillsStart} />

      {/* Download QR — fade up with glow */}
      <motion.div
        className="flex flex-col items-center gap-[1.5vmin] mt-[2vmin] p-[2.5vmin] rounded-[2vmin] bg-surface-card border-2 border-baize"
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.5,
          delay: qrStart,
          ease: 'easeOut',
        }}
        onAnimationComplete={() => {
          // Add glow class after entrance — done via CSS class toggle
        }}
      >
        <motion.div
          animate={{
            boxShadow: [
              '0 0 20px rgba(16, 185, 129, 0.3), 0 0 40px rgba(16, 185, 129, 0.15)',
              '0 0 30px rgba(16, 185, 129, 0.6), 0 0 60px rgba(16, 185, 129, 0.3)',
              '0 0 20px rgba(16, 185, 129, 0.3), 0 0 40px rgba(16, 185, 129, 0.15)',
            ],
          }}
          transition={{
            duration: 3,
            delay: qrStart + 0.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="rounded-[2vmin]"
          style={{ display: 'contents' }}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={qrUrl}
          alt="QR code to download Pool League Pro"
          width={qrSize}
          height={qrSize}
          className="rounded-[0.7vmin]"
        />
        <p className="text-baize font-semibold text-[2vmin]">Get the app</p>
      </motion.div>
    </div>
  );
}
