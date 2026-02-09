'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { Settings, Loader2, Check, X, Save } from 'lucide-react';
import { useAuth } from '@/lib/auth';

interface LeagueSettings {
  leagueName: string;
  primaryColor: string;
  secondaryColor: string;
  contactEmail: string;
  enableNotifications: boolean;
  enablePredictions: boolean;
}

export default function LeagueSettingsPanel() {
  const { getIdToken } = useAuth();
  const [settings, setSettings] = useState<LeagueSettings>({
    leagueName: '',
    primaryColor: '#1976d2',
    secondaryColor: '#dc004e',
    contactEmail: '',
    enableNotifications: true,
    enablePredictions: true,
  });

  const [originalSettings, setOriginalSettings] = useState<LeagueSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    setMessage(null);

    try {
      // Get auth token from Firebase Auth
      const idToken = await getIdToken();

      const response = await fetch('/api/admin/leagues/settings', {
        headers: {
          ...(idToken && { 'Authorization': `Bearer ${idToken}` }),
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load settings');
      }

      const data = await response.json();
      const loadedSettings: LeagueSettings = {
        leagueName: data.settings.leagueName || '',
        primaryColor: data.settings.primaryColor || '#1976d2',
        secondaryColor: data.settings.secondaryColor || '#dc004e',
        contactEmail: data.settings.contactEmail || '',
        enableNotifications: data.settings.enableNotifications ?? true,
        enablePredictions: data.settings.enablePredictions ?? true,
      };

      setSettings(loadedSettings);
      setOriginalSettings(loadedSettings);
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Failed to load league settings',
      });
    } finally {
      setLoading(false);
    }
  };

  const validateSettings = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!settings.leagueName.trim()) {
      newErrors.leagueName = 'League name is required';
    }

    if (!/^#[0-9A-F]{6}$/i.test(settings.primaryColor)) {
      newErrors.primaryColor = 'Invalid hex color (e.g., #1976d2)';
    }

    if (!/^#[0-9A-F]{6}$/i.test(settings.secondaryColor)) {
      newErrors.secondaryColor = 'Invalid hex color (e.g., #dc004e)';
    }

    if (settings.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.contactEmail)) {
      newErrors.contactEmail = 'Invalid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (saving) return;

    // Validate before saving
    if (!validateSettings()) {
      setMessage({
        type: 'error',
        text: 'Please fix the errors before saving',
      });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      // Get auth token from Firebase Auth
      const idToken = await getIdToken();

      const response = await fetch('/api/admin/leagues/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken && { 'Authorization': `Bearer ${idToken}` }),
        },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save settings');
      }

      const data = await response.json();

      // Update original settings to reflect saved state
      setOriginalSettings(settings);

      setMessage({
        type: 'success',
        text: data.message || 'League settings saved successfully',
      });

      // Clear success message after 3 seconds
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to save settings',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (originalSettings) {
      setSettings(originalSettings);
      setErrors({});
      setMessage(null);
    }
  };

  const hasChanges = () => {
    if (!originalSettings) return false;
    return JSON.stringify(settings) !== JSON.stringify(originalSettings);
  };

  if (loading) {
    return (
      <div className="bg-surface-card rounded-card shadow-card p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface-card rounded-card shadow-card p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-orange-400" />
          <h2 className="text-lg font-bold text-white">League Settings</h2>
        </div>
        {saving && (
          <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
        )}
      </div>

      {/* Message Banner */}
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className={clsx(
            'p-3 rounded-lg flex items-center gap-2 text-sm mb-4',
            message.type === 'success'
              ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800'
          )}
        >
          {message.type === 'success' ? (
            <Check className="w-4 h-4 flex-shrink-0" />
          ) : (
            <X className="w-4 h-4 flex-shrink-0" />
          )}
          <span>{message.text}</span>
        </motion.div>
      )}

      {/* Settings Form */}
      <div className="space-y-6">
        {/* League Name */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            League Name
          </label>
          <input
            type="text"
            value={settings.leagueName}
            onChange={(e) => {
              setSettings({ ...settings, leagueName: e.target.value });
              if (errors.leagueName) {
                setErrors({ ...errors, leagueName: '' });
              }
            }}
            className={clsx(
              'w-full bg-surface-elevated border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-baize-light',
              errors.leagueName
                ? 'border-red-500'
                : 'border-surface-border'
            )}
            placeholder="Enter league name"
          />
          {errors.leagueName && (
            <p className="mt-1 text-xs text-red-400">{errors.leagueName}</p>
          )}
        </div>

        {/* Colors */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Primary Color */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Primary Color
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={settings.primaryColor}
                onChange={(e) => {
                  setSettings({ ...settings, primaryColor: e.target.value });
                  if (errors.primaryColor) {
                    setErrors({ ...errors, primaryColor: '' });
                  }
                }}
                className="w-12 h-10 rounded border border-surface-border bg-surface-elevated cursor-pointer"
              />
              <input
                type="text"
                value={settings.primaryColor}
                onChange={(e) => {
                  setSettings({ ...settings, primaryColor: e.target.value });
                  if (errors.primaryColor) {
                    setErrors({ ...errors, primaryColor: '' });
                  }
                }}
                className={clsx(
                  'flex-1 bg-surface-elevated border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-baize-light',
                  errors.primaryColor
                    ? 'border-red-500'
                    : 'border-surface-border'
                )}
                placeholder="#1976d2"
              />
            </div>
            {errors.primaryColor && (
              <p className="mt-1 text-xs text-red-400">{errors.primaryColor}</p>
            )}
          </div>

          {/* Secondary Color */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Secondary Color
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={settings.secondaryColor}
                onChange={(e) => {
                  setSettings({ ...settings, secondaryColor: e.target.value });
                  if (errors.secondaryColor) {
                    setErrors({ ...errors, secondaryColor: '' });
                  }
                }}
                className="w-12 h-10 rounded border border-surface-border bg-surface-elevated cursor-pointer"
              />
              <input
                type="text"
                value={settings.secondaryColor}
                onChange={(e) => {
                  setSettings({ ...settings, secondaryColor: e.target.value });
                  if (errors.secondaryColor) {
                    setErrors({ ...errors, secondaryColor: '' });
                  }
                }}
                className={clsx(
                  'flex-1 bg-surface-elevated border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-baize-light',
                  errors.secondaryColor
                    ? 'border-red-500'
                    : 'border-surface-border'
                )}
                placeholder="#dc004e"
              />
            </div>
            {errors.secondaryColor && (
              <p className="mt-1 text-xs text-red-400">{errors.secondaryColor}</p>
            )}
          </div>
        </div>

        {/* Contact Email */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Contact Email
          </label>
          <input
            type="email"
            value={settings.contactEmail}
            onChange={(e) => {
              setSettings({ ...settings, contactEmail: e.target.value });
              if (errors.contactEmail) {
                setErrors({ ...errors, contactEmail: '' });
              }
            }}
            className={clsx(
              'w-full bg-surface-elevated border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-baize-light',
              errors.contactEmail
                ? 'border-red-500'
                : 'border-surface-border'
            )}
            placeholder="admin@example.com"
          />
          {errors.contactEmail && (
            <p className="mt-1 text-xs text-red-400">{errors.contactEmail}</p>
          )}
        </div>

        {/* Feature Toggles */}
        <div className="space-y-3 pt-4 border-t border-surface-border">
          <h3 className="text-sm font-semibold text-gray-300">Features</h3>

          {/* Enable Notifications */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">Enable Notifications</p>
              <p className="text-xs text-gray-500">
                Allow users to receive push notifications
              </p>
            </div>
            <button
              onClick={() =>
                setSettings({
                  ...settings,
                  enableNotifications: !settings.enableNotifications,
                })
              }
              className={clsx(
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                settings.enableNotifications
                  ? 'bg-baize-light'
                  : 'bg-gray-600'
              )}
            >
              <span
                className={clsx(
                  'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                  settings.enableNotifications ? 'translate-x-6' : 'translate-x-1'
                )}
              />
            </button>
          </div>

          {/* Enable Predictions */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">Enable Predictions</p>
              <p className="text-xs text-gray-500">
                Show AI-powered match predictions
              </p>
            </div>
            <button
              onClick={() =>
                setSettings({
                  ...settings,
                  enablePredictions: !settings.enablePredictions,
                })
              }
              className={clsx(
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                settings.enablePredictions
                  ? 'bg-baize-light'
                  : 'bg-gray-600'
              )}
            >
              <span
                className={clsx(
                  'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                  settings.enablePredictions ? 'translate-x-6' : 'translate-x-1'
                )}
              />
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-4">
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges()}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition',
              hasChanges() && !saving
                ? 'bg-baize-light hover:bg-baize-dark text-white'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            )}
          >
            <Save size={16} />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>

          {hasChanges() && (
            <button
              onClick={handleReset}
              disabled={saving}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-surface-elevated text-gray-400 hover:bg-surface transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Reset
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
