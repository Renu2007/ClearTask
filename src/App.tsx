import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { AuthForm } from './components/AuthForm';
import { SetupNotice } from './components/SetupNotice';
import { TaskDashboard } from './components/TaskDashboard';
import { useTheme } from './hooks/useTheme';
import { checkSupabaseConnection } from './lib/api';
import type { AuthUser, ConnectionCheckResult } from './types/task';

export default function App() {
  const { theme, toggleTheme, setTheme } = useTheme();
  const [connection, setConnection] = useState<ConnectionCheckResult>({
    state: 'checking',
    message: 'Checking Supabase connection...',
  });
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [authSession, setAuthSession] = useState<{
    user: AuthUser;
    accessToken: string;
  } | null>(null);

  const verifyConnection = useCallback(async () => {
    setIsTestingConnection(true);
    const result = await checkSupabaseConnection();
    setConnection(result);
    setIsTestingConnection(false);
  }, []);

  useEffect(() => {
    void verifyConnection();
  }, [verifyConnection]);

  if (connection.state === 'checking') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center px-4">
        <div className="flex items-center gap-3 text-sm font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-4 shadow-xs">
          <Loader2
            className="w-4 h-4 text-indigo-600 dark:text-indigo-400 animate-spin"
            aria-hidden="true"
          />
          <span>Verifying Supabase connection...</span>
        </div>
      </div>
    );
  }

  if (connection.state !== 'connected') {
    return (
      <SetupNotice
        connection={connection}
        isTesting={isTestingConnection}
        onRetry={() => void verifyConnection()}
      />
    );
  }

  if (!authSession) {
    return (
      <AuthForm
        theme={theme}
        onToggleTheme={toggleTheme}
        onAuthenticated={(user, accessToken) =>
          setAuthSession({ user, accessToken })
        }
        onOpenSetupCheck={() => void verifyConnection()}
      />
    );
  }

  return (
    <TaskDashboard
      user={authSession.user}
      accessToken={authSession.accessToken}
      theme={theme}
      onToggleTheme={toggleTheme}
      onSetTheme={setTheme}
      onSignedOut={() => setAuthSession(null)}
      onSchemaMissing={() =>
        setConnection({
          state: 'schema_missing',
          message:
            'The "public.tasks" table was not found in your Supabase PostgreSQL database.',
          env: connection.env,
        })
      }
    />
  );
}
