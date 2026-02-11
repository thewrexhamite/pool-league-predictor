'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react';
import { useAuth, updateUserProfile } from '@/lib/auth';
import type { Tutorial, TutorialStep } from '@/lib/tutorial';
import { TUTORIALS, getAvailableTutorials } from '@/lib/tutorial';
import { celebrateSubtle, celebrateGrand, haptic } from '@/lib/celebrations';
import { withViewTransition } from '@/lib/view-transitions';
import { useHashRouter } from '@/lib/router';
import SpotlightOverlay from './SpotlightOverlay';
import TutorialTooltip from './TutorialTooltip';

interface TutorialContextValue {
  startTutorial: (id: string) => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTutorial: () => void;
  activeTutorial: Tutorial | null;
  currentStepIndex: number;
  currentStep: TutorialStep | null;
  isActive: boolean;
  progress: number;
  completedTutorials: string[];
  isTutorialCompleted: (id: string) => boolean;
  availableTutorials: Tutorial[];
}

const TutorialContext = createContext<TutorialContextValue | null>(null);

const LS_KEY = 'plp-tutorials-completed';
const LS_RESUME_KEY = 'plp-tutorial-resume';

function loadCompletedFromLS(): string[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCompletedToLS(ids: string[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(ids));
  } catch { /* noop */ }
}

export function TutorialProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth();

  const [activeTutorial, setActiveTutorial] = useState<Tutorial | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedTutorials, setCompletedTutorials] = useState<string[]>([]);

  // Load completed tutorials
  useEffect(() => {
    if (profile?.completedTutorials) {
      setCompletedTutorials(profile.completedTutorials);
    } else {
      setCompletedTutorials(loadCompletedFromLS());
    }
  }, [profile]);

  const userRole = useMemo(() => {
    if (profile?.isAdmin) return 'admin' as const;
    if ((profile?.captainClaims?.length ?? 0) > 0) return 'captain' as const;
    if (profile) return 'user' as const;
    return undefined;
  }, [profile]);

  const availableTutorials = useMemo(
    () => getAvailableTutorials(userRole),
    [userRole]
  );

  const currentStep = activeTutorial
    ? activeTutorial.steps[currentStepIndex] ?? null
    : null;

  const progress = activeTutorial
    ? Math.round(((currentStepIndex + 1) / activeTutorial.steps.length) * 100)
    : 0;

  const markCompleted = useCallback(async (tutorialId: string) => {
    setCompletedTutorials(prev => {
      const next = [...new Set([...prev, tutorialId])];
      saveCompletedToLS(next);
      return next;
    });
    // Sync to Firestore
    if (user && profile) {
      const updated = [...new Set([...(profile.completedTutorials || []), tutorialId])];
      try {
        await updateUserProfile(user.uid, { completedTutorials: updated });
      } catch { /* non-critical */ }
    }
    // Clear resume state
    try { localStorage.removeItem(LS_RESUME_KEY); } catch { /* noop */ }
  }, [user, profile]);

  const handleCelebration = useCallback(async (step: TutorialStep) => {
    if (step.celebrate === 'confetti-subtle') {
      await celebrateSubtle();
      haptic.step();
    } else if (step.celebrate === 'confetti-grand') {
      await celebrateGrand();
      haptic.celebrate();
    } else if (step.celebrate === 'badge-unlock') {
      await celebrateGrand();
      haptic.celebrate();
    }
  }, []);

  const startTutorial = useCallback((id: string) => {
    const tutorial = TUTORIALS.find(t => t.id === id);
    if (!tutorial) return;

    // Check for resume
    let startIndex = 0;
    try {
      const resume = localStorage.getItem(LS_RESUME_KEY);
      if (resume) {
        const parsed = JSON.parse(resume);
        if (parsed.id === id && typeof parsed.step === 'number') {
          startIndex = parsed.step;
        }
      }
    } catch { /* noop */ }

    setActiveTutorial(tutorial);
    setCurrentStepIndex(startIndex);

    // Navigate to first step's tab if needed
    const step = tutorial.steps[startIndex];
    if (step?.tab) {
      withViewTransition(() => {
        window.location.hash = `#${step.tab}`;
      });
    }
  }, []);

  const nextStep = useCallback(() => {
    if (!activeTutorial) return;

    const step = activeTutorial.steps[currentStepIndex];
    if (step) handleCelebration(step);

    if (currentStepIndex >= activeTutorial.steps.length - 1) {
      // Tutorial complete
      markCompleted(activeTutorial.id);
      setActiveTutorial(null);
      setCurrentStepIndex(0);
      return;
    }

    const nextIndex = currentStepIndex + 1;
    const nextStepDef = activeTutorial.steps[nextIndex];

    // Save resume state
    try {
      localStorage.setItem(LS_RESUME_KEY, JSON.stringify({ id: activeTutorial.id, step: nextIndex }));
    } catch { /* noop */ }

    // Navigate to tab if needed
    if (nextStepDef?.tab) {
      withViewTransition(() => {
        window.location.hash = `#${nextStepDef.tab}`;
      });
    }

    setCurrentStepIndex(nextIndex);
  }, [activeTutorial, currentStepIndex, handleCelebration, markCompleted]);

  const prevStep = useCallback(() => {
    if (!activeTutorial || currentStepIndex <= 0) return;

    const prevIndex = currentStepIndex - 1;
    const prevStepDef = activeTutorial.steps[prevIndex];

    if (prevStepDef?.tab) {
      withViewTransition(() => {
        window.location.hash = `#${prevStepDef.tab}`;
      });
    }

    setCurrentStepIndex(prevIndex);
  }, [activeTutorial, currentStepIndex]);

  const skipTutorial = useCallback(() => {
    if (!activeTutorial) return;
    markCompleted(activeTutorial.id);
    setActiveTutorial(null);
    setCurrentStepIndex(0);
  }, [activeTutorial, markCompleted]);

  // Keyboard support
  useEffect(() => {
    if (!activeTutorial) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') nextStep();
      else if (e.key === 'ArrowLeft') prevStep();
      else if (e.key === 'Escape') skipTutorial();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [activeTutorial, nextStep, prevStep, skipTutorial]);

  const isTutorialCompleted = useCallback(
    (id: string) => completedTutorials.includes(id),
    [completedTutorials]
  );

  const value: TutorialContextValue = {
    startTutorial,
    nextStep,
    prevStep,
    skipTutorial,
    activeTutorial,
    currentStepIndex,
    currentStep,
    isActive: activeTutorial !== null,
    progress,
    completedTutorials,
    isTutorialCompleted,
    availableTutorials,
  };

  return (
    <TutorialContext.Provider value={value}>
      {children}
      {activeTutorial && currentStep && (
        <>
          <SpotlightOverlay target={currentStep.target} spotlight={currentStep.spotlight} />
          <TutorialTooltip
            step={currentStep}
            stepIndex={currentStepIndex}
            totalSteps={activeTutorial.steps.length}
            progress={progress}
            onNext={nextStep}
            onBack={prevStep}
            onSkip={skipTutorial}
            userName={profile?.displayName}
          />
        </>
      )}
    </TutorialContext.Provider>
  );
}

export function useTutorial(): TutorialContextValue {
  const ctx = useContext(TutorialContext);
  if (!ctx) throw new Error('useTutorial must be used within TutorialProvider');
  return ctx;
}
