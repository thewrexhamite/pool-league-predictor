'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, UserCheck, Star, Bell, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { useAuth, updateUserProfile } from '@/lib/auth';
import type { OnboardingProgress } from '@/lib/auth';
import { ClaimProfileInline } from './ClaimProfileInline';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSetMyTeam?: () => void;
  onEnableNotifications?: () => void;
}

const STEPS = [
  { key: 'welcome' as const, icon: Sparkles, title: 'Welcome to Pool League Pro!', color: 'text-accent' },
  { key: 'claimProfile' as const, icon: UserCheck, title: 'Claim Your Profile', color: 'text-blue-400' },
  { key: 'setMyTeam' as const, icon: Star, title: 'Set Your Team', color: 'text-amber-400' },
  { key: 'enableNotifications' as const, icon: Bell, title: 'Stay Updated', color: 'text-green-400' },
];

export function OnboardingModal({
  isOpen,
  onClose,
  onSetMyTeam,
  onEnableNotifications,
}: OnboardingModalProps) {
  const { user, profile, refreshProfile } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>({});

  const step = STEPS[currentStep];
  const isLastStep = currentStep === STEPS.length - 1;
  const isFirstStep = currentStep === 0;

  const markStepDone = (key: string) => {
    setCompletedSteps(prev => ({ ...prev, [key]: true }));
  };

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (!isFirstStep) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = async () => {
    if (!user) return;
    const onboarding: OnboardingProgress = {
      completedAt: Date.now(),
      steps: {
        welcome: true,
        claimProfile: completedSteps.claimProfile || false,
        setMyTeam: completedSteps.setMyTeam || false,
        enableNotifications: completedSteps.enableNotifications || false,
      },
    };
    try {
      await updateUserProfile(user.uid, { onboarding });
      await refreshProfile();
    } catch {
      // Non-critical — continue even if save fails
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-surface-card border border-surface-border rounded-2xl shadow-elevated w-full max-w-md overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border/50">
          <div className="flex items-center gap-2">
            {STEPS.map((s, i) => (
              <div
                key={s.key}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i === currentStep ? 'bg-baize' : i < currentStep ? 'bg-baize/40' : 'bg-surface-elevated'
                }`}
              />
            ))}
          </div>
          <button onClick={handleComplete} className="text-gray-500 hover:text-white transition p-1">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="px-6 py-8"
          >
            {step.key === 'welcome' && (
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-accent-muted/30 flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-8 h-8 text-accent" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">
                  Welcome to Pool League Pro!
                </h2>
                <p className="text-sm text-gray-400 mb-4">
                  Here&apos;s what you can do with your account:
                </p>
                <ul className="text-left text-sm space-y-2 text-gray-300">
                  <li className="flex items-start gap-2">
                    <Check size={16} className="text-baize mt-0.5 shrink-0" />
                    <span>Claim your player profile to see personalised stats</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check size={16} className="text-baize mt-0.5 shrink-0" />
                    <span>Set a favourite team for a tailored dashboard</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check size={16} className="text-baize mt-0.5 shrink-0" />
                    <span>Get AI-powered insights and match predictions</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check size={16} className="text-baize mt-0.5 shrink-0" />
                    <span>Receive notifications for your team&apos;s fixtures</span>
                  </li>
                </ul>
              </div>
            )}

            {step.key === 'claimProfile' && (
              <div>
                <div className="text-center mb-4">
                  <div className="w-12 h-12 rounded-full bg-blue-900/30 flex items-center justify-center mx-auto mb-3">
                    <UserCheck className="w-6 h-6 text-blue-400" />
                  </div>
                  <h2 className="text-lg font-bold text-white mb-1">
                    Claim Your Player Profile
                  </h2>
                  <p className="text-xs text-gray-400">
                    Link your name to see personal stats, form, and match history.
                  </p>
                </div>
                {completedSteps.claimProfile ? (
                  <div className="flex items-center justify-center gap-2 text-green-400 text-sm">
                    <Check size={16} />
                    <span>Profile claimed!</span>
                  </div>
                ) : (
                  <ClaimProfileInline
                    onComplete={() => markStepDone('claimProfile')}
                  />
                )}
              </div>
            )}

            {step.key === 'setMyTeam' && (
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-amber-900/30 flex items-center justify-center mx-auto mb-4">
                  <Star className="w-8 h-8 text-amber-400" />
                </div>
                <h2 className="text-lg font-bold text-white mb-2">
                  Set Your Team
                </h2>
                <p className="text-sm text-gray-400 mb-6">
                  Choose a team to get a personalised dashboard with squad, fixtures, and predictions.
                </p>
                {completedSteps.setMyTeam ? (
                  <div className="flex items-center justify-center gap-2 text-green-400 text-sm">
                    <Check size={16} />
                    <span>Team set!</span>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      markStepDone('setMyTeam');
                      onSetMyTeam?.();
                    }}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium transition"
                  >
                    Choose My Team
                  </button>
                )}
              </div>
            )}

            {step.key === 'enableNotifications' && (
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-green-900/30 flex items-center justify-center mx-auto mb-4">
                  <Bell className="w-8 h-8 text-green-400" />
                </div>
                <h2 className="text-lg font-bold text-white mb-2">
                  Stay Updated
                </h2>
                <p className="text-sm text-gray-400 mb-6">
                  Get notified about match days, results, and important league updates.
                </p>
                {completedSteps.enableNotifications ? (
                  <div className="flex items-center justify-center gap-2 text-green-400 text-sm">
                    <Check size={16} />
                    <span>Notifications enabled!</span>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      markStepDone('enableNotifications');
                      onEnableNotifications?.();
                    }}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition"
                  >
                    Enable Notifications
                  </button>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-surface-border/50">
          <button
            onClick={handleBack}
            disabled={isFirstStep}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-white disabled:opacity-30 disabled:hover:text-gray-500 transition"
          >
            <ChevronLeft size={16} />
            Back
          </button>

          <button
            onClick={handleComplete}
            className="text-xs text-gray-600 hover:text-gray-400 transition"
          >
            Skip all
          </button>

          <button
            onClick={handleNext}
            className="flex items-center gap-1 text-sm font-medium text-white bg-baize hover:bg-baize-light px-4 py-2 rounded-lg transition"
          >
            {isLastStep ? 'Done' : 'Next'}
            {!isLastStep && <ChevronRight size={16} />}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
