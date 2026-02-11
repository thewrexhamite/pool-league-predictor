'use client';

import Glossary from './Glossary';
import FadeInOnScroll from './ui/FadeInOnScroll';

export default function AppFooter() {
  return (
    <FadeInOnScroll delay={0.1}>
      <Glossary />
      <div className="section-divider mt-6 mb-4" />
      <p className="text-center text-gray-600 text-xs">
        Home Win = 2pts &bull; Away Win = 3pts &bull; Draw = 1pt each
      </p>
      <p className="text-center text-gray-600 text-xs mt-2">
        &copy; Mike Lewis {new Date().getFullYear()} &bull; Pool League Pro
      </p>
    </FadeInOnScroll>
  );
}
