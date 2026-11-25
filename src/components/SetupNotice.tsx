import { useState } from 'react';
import {
  AlertCircle,
  Check,
  Copy,
  Database,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { SUPABASE_SCHEMA_SQL } from '../lib/schemaSql';
import type { ConnectionCheckResult } from '../types/task';

interface SetupNoticeProps {
  connection: ConnectionCheckResult;
  isTesting: boolean;
  onRetry: () => void;
}

export function SetupNotice({
  connection,
  isTesting,
  onRetry,
}: SetupNoticeProps) {
  const [copied, setCopied] = useState(false);

  const handleCopySql = async () => {
    try {
      await navigator.clipboard.writeText(SUPABASE_SCHEMA_SQL);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const isUnconfigured = connection.state === 'unconfigured';
  const isSchemaMissing = connection.state === 'schema_missing';
  const hasValidUrl = Boolean(connection.env?.hasValidUrl);
  const hasValidKey = Boolean(connection.env?.hasValidKey);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col transition-colors duration-150">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          <div className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-600 text-white">
              <Database className="w-4 h-4" aria-hidden="true" />
            </span>
            <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
              ClearTask
            </span>
          </div>

          <span className="hidden sm:inline text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap shrink-0">
            Server-Side Supabase Setup
          </span>

          <button
            type="button"
            onClick={onRetry}
            disabled={isTesting}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-60 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
          >
            <RefreshCw
              className={`w-4 h-4 ${isTesting ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            <span>{isTesting ? 'Testing...' : 'Test Connection'}</span>
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-10 space-y-6">
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xs">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-bold text-slate-900 text-balance">
                {isUnconfigured
                  ? 'Add your Supabase credentials in Server Secrets'
                  : isSchemaMissing
                    ? 'Create the tasks table in Supabase PostgreSQL'
                    : 'Supabase database connection check failed'}
              </h1>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                {connection.message}
              </p>
              {connection.details && (
                <p className="mt-2 text-xs font-mono text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 break-words">
                  {connection.details}
                </p>
              )}
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-slate-200 grid gap-4 sm:grid-cols-2">
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-700 font-mono">
                  SUPABASE_URL
                </span>
                <span
                  className={`text-xs font-medium ${
                    hasValidUrl ? 'text-emerald-700' : 'text-amber-700'
                  }`}
                >
                  {hasValidUrl ? 'Configured' : 'Missing / Invalid'}
                </span>
              </div>
              <p className="mt-1.5 text-xs text-slate-500">
                Your Supabase Project URL from Project Settings → Data API / API.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-700 font-mono">
                  SUPABASE_PUBLISHABLE_KEY
                </span>
                <span
                  className={`text-xs font-medium ${
                    hasValidKey ? 'text-emerald-700' : 'text-amber-700'
                  }`}
                >
                  {hasValidKey ? 'Configured' : 'Missing / Invalid'}
                </span>
              </div>
              <p className="mt-1.5 text-xs text-slate-500">
                Your Supabase publishable key from Project Settings → API Keys.
              </p>
            </div>
          </div>

          <div className="mt-5 p-4 rounded-lg bg-blue-50/70 border border-blue-200 text-xs text-slate-700 space-y-1.5 leading-relaxed">
            <p className="font-semibold text-slate-900">
              Where to enter these environment variables:
            </p>
            <p>
              <span className="font-medium text-slate-900">In AI Studio:</span>{' '}
              Open <span className="font-semibold">Settings → Secrets</span> in the UI and add{' '}
              <code className="font-mono bg-white px-1 py-0.5 rounded border border-blue-200">
                SUPABASE_URL
              </code>{' '}
              and{' '}
              <code className="font-mono bg-white px-1 py-0.5 rounded border border-blue-200">
                SUPABASE_PUBLISHABLE_KEY
              </code>
              .
            </p>
            <p>
              <span className="font-medium text-slate-900">Locally:</span>{' '}
              Add both variables to a gitignored <code className="font-mono">.env</code> file in the project root. Both values stay strictly on the server and are never exposed in public frontend code.
            </p>
          </div>
        </section>

        <section className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Database Schema & Row-Level Security
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Run this SQL in your Supabase Dashboard → SQL Editor to create the{' '}
                <code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">
                  public.tasks
                </code>{' '}
                table and per-user access policies.
              </p>
            </div>

            <button
              type="button"
              onClick={handleCopySql}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                  <span>Copied SQL</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Copy SQL</span>
                </>
              )}
            </button>
          </div>

          <pre className="mt-4 p-4 bg-slate-900 text-slate-100 rounded-lg text-xs font-mono overflow-x-auto leading-relaxed">
            <code>{SUPABASE_SCHEMA_SQL}</code>
          </pre>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-4 pt-5 border-t border-slate-200">
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" aria-hidden="true" />
              <span>
                Credentials stay strictly on the Express backend; PostgreSQL RLS isolates each user&apos;s tasks.
              </span>
            </div>

            <button
              type="button"
              onClick={onRetry}
              disabled={isTesting}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60 whitespace-nowrap shrink-0"
            >
              <RefreshCw
                className={`w-4 h-4 ${isTesting ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
              <span>{isTesting ? 'Verifying...' : 'Verify Connection'}</span>
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
