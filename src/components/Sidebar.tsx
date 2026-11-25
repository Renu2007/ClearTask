import {
  CalendarDays,
  CheckSquare,
  LayoutDashboard,
  ListTodo,
  Loader2,
  LogOut,
  Settings,
  X,
} from 'lucide-react';
import type { AuthUser, DashboardSection } from '../types/task';

interface SidebarProps {
  activeSection: DashboardSection;
  onSelectSection: (section: DashboardSection) => void;
  pendingCount: number;
  overdueCount: number;
  user: AuthUser;
  isSigningOut: boolean;
  onSignOut: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const NAV_ITEMS: Array<{
  id: DashboardSection;
  label: string;
  icon: typeof LayoutDashboard;
}> = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'tasks', label: 'My Tasks', icon: ListTodo },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function Sidebar({
  activeSection,
  onSelectSection,
  pendingCount,
  overdueCount,
  user,
  isSigningOut,
  onSignOut,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const handleNavigate = (section: DashboardSection) => {
    onSelectSection(section);
    onCloseMobile();
  };

  const navContent = (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800">
      <div className="h-16 px-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
        <button
          type="button"
          onClick={() => handleNavigate('dashboard')}
          className="flex items-center gap-2.5 whitespace-nowrap text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 rounded-lg"
        >
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-600 text-white shadow-xs">
            <CheckSquare className="w-4 h-4" aria-hidden="true" />
          </span>
          <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
            ClearTask
          </span>
        </button>

        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Close navigation menu"
          className="lg:hidden w-9 h-9 inline-flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>

      <nav className="flex-1 p-3.5 space-y-1 overflow-y-auto" aria-label="Workspace navigation">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNavigate(item.id)}
              aria-current={active ? 'page' : undefined}
              className={`w-full h-11 px-3.5 flex items-center justify-between gap-3 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
                active
                  ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <span className="flex items-center gap-3 min-w-0">
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    active
                      ? 'text-indigo-600 dark:text-indigo-400'
                      : 'text-slate-400 dark:text-slate-500'
                  }`}
                  aria-hidden="true"
                />
                <span className="truncate">{item.label}</span>
              </span>

              {item.id === 'tasks' && pendingCount > 0 && (
                <span
                  className={`text-xs font-mono tabular-nums px-2 py-0.5 rounded-md ${
                    overdueCount > 0
                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                      : active
                        ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {pendingCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-3 shrink-0">
        <div className="flex items-center gap-3 px-1">
          <div
            aria-hidden="true"
            className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold text-xs flex items-center justify-center shrink-0 uppercase"
          >
            {user.email.slice(0, 2)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
              {user.email}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Supabase Authenticated
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onSignOut}
          disabled={isSigningOut}
          className="w-full h-10 px-3.5 inline-flex items-center justify-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors disabled:opacity-60 whitespace-nowrap"
        >
          {isSigningOut ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
          )}
          <span>{isSigningOut ? 'Signing out...' : 'Sign Out'}</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block w-64 shrink-0 sticky top-0 h-screen">
        {navContent}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex">
          <div
            onClick={onCloseMobile}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs dark:bg-slate-950/75"
          />
          <aside className="relative z-10 w-72 max-w-[85vw] h-full shadow-2xl">
            {navContent}
          </aside>
        </div>
      )}
    </>
  );
}
