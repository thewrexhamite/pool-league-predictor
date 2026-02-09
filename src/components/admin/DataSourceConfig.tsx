'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { Database, Loader2, Check, X, Save, Settings } from 'lucide-react';
import { getAuthToken } from '@/lib/auth/admin-auth';
import type { DataSourceConfig as DataSourceConfigType, DataSourceType } from '@/lib/types';

// Helper to make authenticated API calls
async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = await getAuthToken();

  if (!token) {
    throw new Error('Not authenticated');
  }

  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
    },
  });
}

interface DataSourceConfigProps {
  leagueId: string;
  existingConfig?: DataSourceConfigType | null;
  onSave?: () => void;
}

const SOURCE_TYPES: { value: DataSourceType; label: string; description: string }[] = [
  {
    value: 'leagueapplive',
    label: 'LeagueAppLive',
    description: 'Scrape data from LeagueAppLive (RackEmApp)',
  },
  {
    value: 'manual',
    label: 'Manual Upload',
    description: 'Manually upload match results and player data',
  },
  {
    value: 'api',
    label: 'API Integration',
    description: 'Connect to an external API for automated data sync',
  },
];

export default function DataSourceConfig({
  leagueId,
  existingConfig,
  onSave,
}: DataSourceConfigProps) {
  const [sourceType, setSourceType] = useState<DataSourceType>('leagueapplive');
  const [enabled, setEnabled] = useState(true);
  const [config, setConfig] = useState<Record<string, any>>({});

  // Source-specific config fields
  const [leagueAppUrl, setLeagueAppUrl] = useState('');
  const [apiEndpoint, setApiEndpoint] = useState('');
  const [apiKey, setApiKey] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Initialize form with existing config
  useEffect(() => {
    if (existingConfig) {
      setSourceType(existingConfig.sourceType);
      setEnabled(existingConfig.enabled);
      setConfig(existingConfig.config || {});

      // Load source-specific fields
      if (existingConfig.config?.leagueAppUrl) {
        setLeagueAppUrl(existingConfig.config.leagueAppUrl);
      }
      if (existingConfig.config?.apiEndpoint) {
        setApiEndpoint(existingConfig.config.apiEndpoint);
      }
      if (existingConfig.config?.apiKey) {
        setApiKey(existingConfig.config.apiKey);
      }
    }
  }, [existingConfig]);

  // Build config object based on source type
  const buildConfig = (): Record<string, any> => {
    switch (sourceType) {
      case 'leagueapplive':
        return leagueAppUrl ? { leagueAppUrl } : {};
      case 'api':
        return {
          ...(apiEndpoint && { apiEndpoint }),
          ...(apiKey && { apiKey }),
        };
      case 'manual':
      default:
        return {};
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return;

    setIsSubmitting(true);
    setMessage(null);

    try {
      const payload = {
        leagueId,
        sourceType,
        config: buildConfig(),
        enabled,
      };

      const response = await fetchWithAuth('/api/admin/data-sources', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save data source configuration');
      }

      setMessage({ type: 'success', text: 'Data source configuration saved successfully' });
      setTimeout(() => {
        setMessage(null);
        onSave?.();
      }, 2000);
    } catch (error) {
      console.error('Error saving data source config:', error);
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to save configuration',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Data Source Configuration
          </h3>
        </div>
        {isSubmitting && (
          <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
        )}
      </div>

      {/* Message Banner */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={clsx(
              'p-3 rounded-lg flex items-center gap-2 text-sm',
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
      </AnimatePresence>

      {/* Configuration Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 space-y-4">
          {/* Source Type Selection */}
          <div className="form-control w-full">
            <label className="label">
              <span className="label-text font-medium">Source Type</span>
            </label>
            <select
              className="select select-bordered w-full"
              value={sourceType}
              onChange={(e) => setSourceType(e.target.value as DataSourceType)}
              disabled={isSubmitting}
            >
              {SOURCE_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            <label className="label">
              <span className="label-text-alt text-gray-600 dark:text-gray-400">
                {SOURCE_TYPES.find((t) => t.value === sourceType)?.description}
              </span>
            </label>
          </div>

          {/* Source-Specific Configuration */}
          <AnimatePresence mode="wait">
            {sourceType === 'leagueapplive' && (
              <motion.div
                key="leagueapplive"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4"
              >
                <div className="divider text-sm">LeagueAppLive Settings</div>
                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text">LeagueAppLive URL</span>
                  </label>
                  <input
                    type="url"
                    placeholder="https://leagueapplive.com/league/123"
                    className="input input-bordered w-full"
                    value={leagueAppUrl}
                    onChange={(e) => setLeagueAppUrl(e.target.value)}
                    disabled={isSubmitting}
                  />
                  <label className="label">
                    <span className="label-text-alt">
                      URL to the league&apos;s LeagueAppLive page
                    </span>
                  </label>
                </div>
              </motion.div>
            )}

            {sourceType === 'api' && (
              <motion.div
                key="api"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4"
              >
                <div className="divider text-sm">API Settings</div>
                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text">API Endpoint</span>
                  </label>
                  <input
                    type="url"
                    placeholder="https://api.example.com/v1/leagues"
                    className="input input-bordered w-full"
                    value={apiEndpoint}
                    onChange={(e) => setApiEndpoint(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text">API Key</span>
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••••••••••"
                    className="input input-bordered w-full"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    disabled={isSubmitting}
                  />
                  <label className="label">
                    <span className="label-text-alt">
                      API key for authentication (stored securely)
                    </span>
                  </label>
                </div>
              </motion.div>
            )}

            {sourceType === 'manual' && (
              <motion.div
                key="manual"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4"
              >
                <div className="divider text-sm">Manual Upload</div>
                <div className="alert alert-info">
                  <Settings className="w-5 h-5" />
                  <span className="text-sm">
                    No configuration needed. You can manually upload match results and player data through the admin interface.
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Enabled Toggle */}
          <div className="divider"></div>
          <div className="form-control">
            <label className="label cursor-pointer justify-start gap-3">
              <input
                type="checkbox"
                className="toggle toggle-success"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                disabled={isSubmitting}
              />
              <div>
                <span className="label-text font-medium">Enable Data Source</span>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                  {enabled
                    ? 'This data source is active and will be used for syncing'
                    : 'This data source is disabled and will not be used'}
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className={clsx(
              'btn btn-primary gap-2',
              isSubmitting && 'loading'
            )}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Configuration
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
