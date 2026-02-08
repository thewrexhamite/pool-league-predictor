'use client';

import Glossary from './Glossary';

export default function AppFooter() {
  return (
    <>
      <Glossary />
      <p className="text-center text-gray-600 text-xs mt-4">
        Home Win = 2pts &bull; Away Win = 3pts &bull; Draw = 1pt each
      </p>
      <p className="text-center text-gray-600 text-xs mt-2">
        &copy; Mike Lewis {new Date().getFullYear()} &bull; Pool League Pro
      </p>
    </>
  );
}
