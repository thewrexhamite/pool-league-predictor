'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { X, Loader2, Check, AlertCircle, Plus, Trash2 } from 'lucide-react';
import type { LeagueConfig } from '@/lib/types';

interface LeagueFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (league: Partial<LeagueConfig>) => Promise<boolean>;
  league?: LeagueConfig | null;
  mode: 'create' | 'edit';
}

export default function LeagueForm({
  isOpen,
  onClose,
  onSubmit,
  league,
  mode,
}: LeagueFormProps) {
  const [formData, setFormData] = useState<Partial<LeagueConfig>>({
    name: '',
    shortName: '',
    primaryColor: '#059669',
    logo: '',
    seasons: [],
  });

  const [seasonInput, setSeasonInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Initialize form with league data in edit mode
  useEffect(() => {
    if (mode === 'edit' && league) {
      setFormData({
        name: league.name,
        shortName: league.shortName,
        primaryColor: league.primaryColor,
        logo: league.logo || '',
        seasons: league.seasons || [],
      });
    } else {
      setFormData({
        name: '',
        shortName: '',
        primaryColor: '#059669',
        logo: '',
        seasons: [],
      });
    }
    setErrors({});
    setMessage(null);
  }, [mode, league, isOpen]);

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name?.trim()) {
      newErrors.name = 'League name is required';
    }

    if (!formData.shortName?.trim()) {
      newErrors.shortName = 'Short name is required';
    } else if (formData.shortName.length > 10) {
      newErrors.shortName = 'Short name must be 10 characters or less';
    }

    if (!formData.primaryColor) {
      newErrors.primaryColor = 'Primary color is required';
    } else if (!/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(formData.primaryColor)) {
      newErrors.primaryColor = 'Invalid color format (use hex color like #FF0000)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      const success = await onSubmit(formData);

      if (success) {
        setMessage({
          type: 'success',
          text: `League ${mode === 'create' ? 'created' : 'updated'} successfully`,
        });
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setMessage({
          type: 'error',
          text: `Failed to ${mode === 'create' ? 'create' : 'update'} league`,
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'An unexpected error occurred',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle adding a season
  const handleAddSeason = () => {
    if (!seasonInput.trim()) return;

    if (formData.seasons?.includes(seasonInput.trim())) {
      setErrors({ ...errors, season: 'Season already exists' });
      return;
    }

    setFormData({
      ...formData,
      seasons: [...(formData.seasons || []), seasonInput.trim()],
    });
    setSeasonInput('');
    setErrors({ ...errors, season: '' });
  };

  // Handle removing a season
  const handleRemoveSeason = (season: string) => {
    setFormData({
      ...formData,
      seasons: formData.seasons?.filter(s => s !== season) || [],
    });
  };

  // Don't render if not open
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-fixed-black/50 z-40 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
          >
            <div className="bg-surface-card rounded-lg shadow-elevated w-full max-w-2xl my-8">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-surface-border">
                <h2 className="text-2xl font-bold text-white">
                  {mode === 'create' ? 'Create New League' : 'Edit League'}
                </h2>
                <button
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="p-2 text-gray-400 hover:text-white hover:bg-surface-elevated rounded-lg transition-colors disabled:opacity-50"
                  aria-label="Close"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* Message Banner */}
                {message && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={clsx(
                      'p-3 rounded-lg flex items-center gap-2 text-sm',
                      message.type === 'success'
                        ? 'bg-win-muted text-win border border-win'
                        : 'bg-loss-muted text-loss border border-loss'
                    )}
                  >
                    {message.type === 'success' ? (
                      <Check className="w-4 h-4 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    )}
                    <span>{message.text}</span>
                  </motion.div>
                )}

                {/* League Name */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-white mb-2">
                    League Name <span className="text-loss">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={formData.name || ''}
                    onChange={e =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    disabled={isSubmitting}
                    className={clsx(
                      'w-full px-4 py-2 bg-surface-elevated border rounded-lg text-white',
                      'focus:outline-none focus:ring-2 focus:ring-baize focus:border-transparent',
                      'disabled:opacity-50 disabled:cursor-not-allowed',
                      errors.name
                        ? 'border-loss'
                        : 'border-surface-border hover:border-gray-600'
                    )}
                    placeholder="e.g., Wrexham Pool League"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-loss flex items-center gap-1">
                      <AlertCircle size={14} />
                      {errors.name}
                    </p>
                  )}
                </div>

                {/* Short Name */}
                <div>
                  <label htmlFor="shortName" className="block text-sm font-medium text-white mb-2">
                    Short Name <span className="text-loss">*</span>
                  </label>
                  <input
                    type="text"
                    id="shortName"
                    value={formData.shortName || ''}
                    onChange={e =>
                      setFormData({ ...formData, shortName: e.target.value })
                    }
                    disabled={isSubmitting}
                    maxLength={10}
                    className={clsx(
                      'w-full px-4 py-2 bg-surface-elevated border rounded-lg text-white',
                      'focus:outline-none focus:ring-2 focus:ring-baize focus:border-transparent',
                      'disabled:opacity-50 disabled:cursor-not-allowed',
                      errors.shortName
                        ? 'border-loss'
                        : 'border-surface-border hover:border-gray-600'
                    )}
                    placeholder="e.g., Wrexham"
                  />
                  <p className="mt-1 text-xs text-gray-400">
                    {formData.shortName?.length || 0}/10 characters
                  </p>
                  {errors.shortName && (
                    <p className="mt-1 text-sm text-loss flex items-center gap-1">
                      <AlertCircle size={14} />
                      {errors.shortName}
                    </p>
                  )}
                </div>

                {/* Primary Color */}
                <div>
                  <label htmlFor="primaryColor" className="block text-sm font-medium text-white mb-2">
                    Primary Color <span className="text-loss">*</span>
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      id="primaryColor"
                      value={formData.primaryColor || '#059669'}
                      onChange={e =>
                        setFormData({ ...formData, primaryColor: e.target.value })
                      }
                      disabled={isSubmitting}
                      className="w-16 h-10 rounded border border-surface-border cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <input
                      type="text"
                      value={formData.primaryColor || ''}
                      onChange={e =>
                        setFormData({ ...formData, primaryColor: e.target.value })
                      }
                      disabled={isSubmitting}
                      className={clsx(
                        'flex-1 px-4 py-2 bg-surface-elevated border rounded-lg text-white',
                        'focus:outline-none focus:ring-2 focus:ring-baize focus:border-transparent',
                        'disabled:opacity-50 disabled:cursor-not-allowed',
                        errors.primaryColor
                          ? 'border-loss'
                          : 'border-surface-border hover:border-gray-600'
                      )}
                      placeholder="#059669"
                    />
                  </div>
                  {errors.primaryColor && (
                    <p className="mt-1 text-sm text-loss flex items-center gap-1">
                      <AlertCircle size={14} />
                      {errors.primaryColor}
                    </p>
                  )}
                </div>

                {/* Logo URL */}
                <div>
                  <label htmlFor="logo" className="block text-sm font-medium text-white mb-2">
                    Logo URL
                  </label>
                  <input
                    type="url"
                    id="logo"
                    value={formData.logo || ''}
                    onChange={e =>
                      setFormData({ ...formData, logo: e.target.value })
                    }
                    disabled={isSubmitting}
                    className={clsx(
                      'w-full px-4 py-2 bg-surface-elevated border rounded-lg text-white',
                      'focus:outline-none focus:ring-2 focus:ring-baize focus:border-transparent',
                      'disabled:opacity-50 disabled:cursor-not-allowed',
                      'border-surface-border hover:border-gray-600'
                    )}
                    placeholder="https://example.com/logo.png"
                  />
                  <p className="mt-1 text-xs text-gray-400">
                    Optional: Direct URL to league logo image
                  </p>
                  {formData.logo && (
                    <div className="mt-2">
                      <img
                        src={formData.logo}
                        alt="Logo preview"
                        className="w-16 h-16 object-contain rounded border border-surface-border bg-surface-elevated"
                        onError={e => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Seasons */}
                <div>
                  <label htmlFor="seasonInput" className="block text-sm font-medium text-white mb-2">
                    Seasons
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      id="seasonInput"
                      value={seasonInput}
                      onChange={e => setSeasonInput(e.target.value)}
                      onKeyPress={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddSeason();
                        }
                      }}
                      disabled={isSubmitting}
                      className={clsx(
                        'flex-1 px-4 py-2 bg-surface-elevated border rounded-lg text-white',
                        'focus:outline-none focus:ring-2 focus:ring-baize focus:border-transparent',
                        'disabled:opacity-50 disabled:cursor-not-allowed',
                        'border-surface-border hover:border-gray-600'
                      )}
                      placeholder="e.g., 2526 (press Enter to add)"
                    />
                    <button
                      type="button"
                      onClick={handleAddSeason}
                      disabled={isSubmitting || !seasonInput.trim()}
                      className="px-4 py-2 bg-baize text-white rounded-lg hover:bg-baize-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <Plus size={16} />
                      Add
                    </button>
                  </div>
                  {errors.season && (
                    <p className="mb-2 text-sm text-loss flex items-center gap-1">
                      <AlertCircle size={14} />
                      {errors.season}
                    </p>
                  )}
                  {formData.seasons && formData.seasons.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.seasons.map(season => (
                        <span
                          key={season}
                          className="inline-flex items-center gap-2 px-3 py-1 bg-surface-elevated border border-surface-border rounded-lg text-sm text-white"
                        >
                          {season}
                          <button
                            type="button"
                            onClick={() => handleRemoveSeason(season)}
                            disabled={isSubmitting}
                            className="text-gray-400 hover:text-loss transition-colors disabled:opacity-50"
                            aria-label={`Remove ${season}`}
                          >
                            <Trash2 size={14} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="mt-2 text-xs text-gray-400">
                    Add season identifiers (e.g., 2526 for 2025-26 season)
                  </p>
                </div>

                {/* Form Actions */}
                <div className="flex gap-3 pt-4 border-t border-surface-border">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2 bg-surface-elevated text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2 bg-baize text-white rounded-lg hover:bg-baize-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {mode === 'create' ? 'Creating...' : 'Saving...'}
                      </>
                    ) : (
                      <>{mode === 'create' ? 'Create League' : 'Save Changes'}</>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
