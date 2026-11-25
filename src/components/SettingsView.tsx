import { useState } from 'react';
import {
  CheckCircle2,
  Database,
  Loader2,
  LogOut,
  Moon,
  RefreshCw,
  ShieldCheck,
  Sun,
} from 'lucide-react';
import { checkSupabaseConnection } from '../lib/api';
import type {
  AuthUser,
  ConnectionCheckResult,
  TaskPriority,
  TaskSort,
  ThemeMode,
} from '../types/task';

interface SettingsViewProps {
  user: AuthUser;
  theme: ThemeMode;
  onSetTheme: (mode: ThemeMode) => void;
  defaultPriority: TaskPriority;
  onChangeDefaultPriority: (priority: TaskPriority) => void;
  defaultSort: TaskSort;
  onChangeDefaultSort: (sort: TaskSort) => void;
  isSigningOut: boolean;
  onSignOut: () => void;
}

export function SettingsView({
  user,
  theme,
  onSetTheme,
  defaultPriority,
  onChangeDefaultPriority,
  defaultSort,
  onChangeDefaultSort,
  isSigningOut,
  onSignOut,
}: SettingsViewProps) {
  const [healthResult, setHealthResult] =
    useState<ConnectionCheckResult | null>(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);

  const handleCheckConnection = async () => {
    setIsCheckingHealth(true);
    const result = await checkSupabaseConnection();
    setHealthResult(result);
    setIsCheckingHealth(false);
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
          Settings
        </h1>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Customize workspace appearance, task defaults, and verify your Supabase connection
        </p>
      </div>

      {/* Appearance */}
      <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Appearance
          </h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Choose between a clean light workspace or dark mode
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => onSetTheme('light')}
            aria-pressed={theme === 'light'}
            className={`p-4 rounded-xl border text-left transition-all ${
              theme === 'light'
                ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 ring-2 ring-indigo-600/20'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                <Sun className="w-4 h-4 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
                <span>Light Mode</span>
              </span>
              {theme === 'light' && (
                <CheckCircle2 className="w-4 h-4 text-indigo-600" aria-hidden="true" />
              )}
            </div>
            <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
              Crisp white surfaces on a soft slate canvas
            </p>
          </button>

          <button
            type="button"
            onClick={() => onSetTheme('dark')}
            aria-pressed={theme === 'dark'}
            className={`p-4 rounded-xl border text-left transition-all ${
              theme === 'dark'
                ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 ring-2 ring-indigo-500/20'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                <Moon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
                <span>Dark Mode</span>
              </span>
              {theme === 'dark' && (
                <CheckCircle2 className="w-4 h-4 text-indigo-500" aria-hidden="true" />
              )}
            </div>
            <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
              Deep slate surfaces for comfortable low-light focus
            </p>
          </button>
        </div>
      </section>

      {/* Task Preferences */}
      <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-5">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Task Preferences
          </h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Configure defaults when creating and viewing tasks
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="settings-default-priority"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Default Priority for New Tasks
            </label>
            <select
              id="settings-default-priority"
              value={defaultPriority}
              onChange={(e) =>
                onChangeDefaultPriority(e.target.value as TaskPriority)
              }
              className="w-full h-10 px-3 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="settings-default-sort"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Task List Sort Order
            </label>
            <select
              id="settings-default-sort"
              value={defaultSort}
              onChange={(e) => onChangeDefaultSort(e.target.value as TaskSort)}
              className="w-full h-10 px-3 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="due_asc">Due Date (Earliest)</option>
              <option value="priority_desc">Priority (High to Low)</option>
              <option value="title_asc">Title (A–Z)</option>
            </select>
          </div>
        </div>
      </section>

      {/* Account & Supabase Database */}
      <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Account & Supabase Connection
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Signed in as{' '}
              <span className="font-medium text-slate-800 dark:text-slate-200">
                {user.email}
              </span>
            </p>
          </div>

          <button
            type="button"
            onClick={() => void handleCheckConnection()}
            disabled={isCheckingHealth}
            className="h-9 px-3.5 inline-flex items-center gap-2 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 rounded-xl transition-colors disabled:opacity-60 whitespace-nowrap"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isCheckingHealth ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            <span>
              {isCheckingHealth ? 'Checking...' : 'Verify Database Connection'}
            </span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-start gap-2.5">
            <Database className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="font-semibold text-slate-900 dark:text-slate-100">
                PostgreSQL Persistence
              </p>
              <p className="mt-0.5 text-slate-500 dark:text-slate-400">
                Tasks are saved in <code className="font-mono">public.tasks</code> via server-side Supabase routes.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="font-semibold text-slate-900 dark:text-slate-100">
                Row-Level Security Active
              </p>
              <p className="mt-0.5 text-slate-500 dark:text-slate-400">
                Each user can only view, create, update, and delete their own tasks.
              </p>
            </div>
          </div>
        </div>

        {healthResult && (
          <div
            role="status"
            className={`p-3.5 rounded-xl border text-xs ${
              healthResult.state === 'connected'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/50 dark:border-emerald-800 dark:text-emerald-300'
                : 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/50 dark:border-rose-800 dark:text-rose-300'
            }`}
          >
            <p className="font-semibold">{healthResult.message}</p>
            {healthResult.details && (
              <p className="mt-1 font-mono break-words">{healthResult.details}</p>
            )}
          </div>
        )}

        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onSignOut}
            disabled={isSigningOut}
            className="h-10 px-4 inline-flex items-center gap-2 text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 rounded-xl transition-colors disabled:opacity-60 whitespace-nowrap"
          >
            {isSigningOut ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
            )}
            <span>{isSigningOut ? 'Signing out...' : 'Sign Out'}</span>
          </button>
        </div>
      </section>
    </div>
  );
}
