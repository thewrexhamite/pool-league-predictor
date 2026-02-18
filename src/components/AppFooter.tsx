'use client';

import Link from 'next/link';
import Glossary from './Glossary';
import FadeInOnScroll from './ui/FadeInOnScroll';

export default function AppFooter() {
  return (
    <FadeInOnScroll delay={0.1}>
      <Glossary />
      <div className="section-divider mt-6 mb-4" />
      <p className="text-center text-gray-500 text-xs mb-1">
        <Link href="/kiosk" className="hover:text-gray-300 transition hover-underline">
          Chalk It Up! &mdash; Live Table Queue
        </Link>
      </p>
      <p className="text-center text-gray-600 text-xs tracking-wide">
        &copy; Mike Lewis {new Date().getFullYear()} &bull; Pool League Pro
      </p>
    </FadeInOnScroll>
  );
}
