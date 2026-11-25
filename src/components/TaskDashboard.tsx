import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Menu,
  Moon,
  Plus,
  RefreshCw,
  Sun,
  X,
} from 'lucide-react';
import {
  ApiError,
  createUserTask,
  deleteUserTask,
  fetchUserTasks,
  signOutSession,
  updateUserTask,
} from '../lib/api';
import { getTodayLocalIso, isTaskOverdue } from '../lib/taskUtils';
import type {
  AuthUser,
  DashboardSection,
  Task,
  TaskFilter,
  TaskPriority,
  TaskSort,
  ThemeMode,
} from '../types/task';
import { CalendarView } from './CalendarView';
import { DashboardView } from './DashboardView';
import { SettingsView } from './SettingsView';
import { Sidebar } from './Sidebar';
import { TaskModal } from './TaskModal';
import { TasksView } from './TasksView';

interface TaskDashboardProps {
  user: AuthUser;
  accessToken: string;
  theme: ThemeMode;
  onToggleTheme: () => void;
  onSetTheme: (mode: ThemeMode) => void;
  onSignedOut: () => void;
  onSchemaMissing: () => void;
}

const SECTION_TITLES: Record<DashboardSection, string> = {
  dashboard: 'Dashboard',
  tasks: 'My Tasks',
  calendar: 'Calendar',
  settings: 'Settings',
};

export function TaskDashboard({
  user,
  accessToken,
  theme,
  onToggleTheme,
  onSetTheme,
  onSignedOut,
  onSchemaMissing,
}: TaskDashboardProps) {
  const [activeSection, setActiveSection] =
    useState<DashboardSection>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [statusFilter, setStatusFilter] = useState<TaskFilter>('all');
  const [sortOrder, setSortOrder] = useState<TaskSort>('newest');
  const [defaultPriority, setDefaultPriority] =
    useState<TaskPriority>('medium');

  const [isLoading, setIsLoading] = useState(true);
  const [isSavingModal, setIsSavingModal] = useState(false);
  const [busyTaskIds, setBusyTaskIds] = useState<Record<string, boolean>>({});
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [modalInitialDueDate, setModalInitialDueDate] = useState<string | null>(
    null
  );

  const setTaskBusy = (taskId: string, busy: boolean) => {
    setBusyTaskIds((prev) => {
      if (busy) return { ...prev, [taskId]: true };
      const next = { ...prev };
      delete next[taskId];
      return next;
    });
  };

  const handleApiError = useCallback(
    (err: unknown, fallbackMessage: string) => {
      if (err instanceof ApiError) {
        if (err.code === 'SCHEMA_MISSING') {
          onSchemaMissing();
          return;
        }
        if (err.status === 401) {
          onSignedOut();
          return;
        }
        setErrorMessage(err.message);
        return;
      }
      setErrorMessage(err instanceof Error ? err.message : fallbackMessage);
    },
    [onSchemaMissing, onSignedOut]
  );

  const fetchTasks = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const data = await fetchUserTasks(accessToken);
      setTasks(data);
    } catch (err) {
      handleApiError(err, 'Failed to load tasks from Supabase.');
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, handleApiError]);

  useEffect(() => {
    void fetchTasks();
  }, [fetchTasks]);

  const openCreateModal = (dueDate: string | null = null) => {
    setEditingTask(null);
    setModalInitialDueDate(dueDate);
    setModalOpen(true);
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setModalInitialDueDate(null);
    setModalOpen(true);
  };

  const handleSaveTaskModal = async (payload: {
    title: string;
    description: string;
    priority: TaskPriority;
    due_date: string | null;
  }): Promise<boolean> => {
    setIsSavingModal(true);
    setErrorMessage(null);

    try {
      if (editingTask) {
        const updated = await updateUserTask(
          accessToken,
          editingTask.id,
          payload
        );
        setTasks((prev) =>
          prev.map((item) => (item.id === editingTask.id ? updated : item))
        );
      } else {
        const created = await createUserTask(accessToken, payload);
        setTasks((prev) => [created, ...prev]);
      }
      return true;
    } catch (err) {
      handleApiError(
        err,
        editingTask ? 'Could not update task.' : 'Could not save task.'
      );
      return false;
    } finally {
      setIsSavingModal(false);
    }
  };

  const handleToggleTask = async (task: Task) => {
    setTaskBusy(task.id, true);
    setErrorMessage(null);

    try {
      const updated = await updateUserTask(accessToken, task.id, {
        is_completed: !task.is_completed,
      });
      setTasks((prev) =>
        prev.map((item) => (item.id === task.id ? updated : item))
      );
    } catch (err) {
      handleApiError(err, 'Could not update task status.');
    } finally {
      setTaskBusy(task.id, false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    setTaskBusy(taskId, true);
    setErrorMessage(null);

    try {
      await deleteUserTask(accessToken, taskId);
      setTasks((prev) => prev.filter((item) => item.id !== taskId));
    } catch (err) {
      handleApiError(err, 'Could not delete task.');
    } finally {
      setTaskBusy(taskId, false);
    }
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    setErrorMessage(null);
    try {
      await signOutSession(accessToken);
    } catch {
      // Clear local memory session regardless of network outcome
    } finally {
      onSignedOut();
    }
  };

  const handleNavigateWithFilter = (
    section: DashboardSection,
    filter?: TaskFilter
  ) => {
    if (filter) {
      setStatusFilter(filter);
    }
    setActiveSection(section);
  };

  const { pendingCount, overdueCount } = useMemo(() => {
    const todayIso = getTodayLocalIso();
    let pending = 0;
    let overdue = 0;
    for (const task of tasks) {
      if (!task.is_completed) {
        pending += 1;
        if (isTaskOverdue(task, todayIso)) overdue += 1;
      }
    }
    return { pendingCount: pending, overdueCount: overdue };
  }, [tasks]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex transition-colors duration-150">
      <Sidebar
        activeSection={activeSection}
        onSelectSection={setActiveSection}
        pendingCount={pendingCount}
        overdueCount={overdueCount}
        user={user}
        isSigningOut={isSigningOut}
        onSignOut={() => void handleSignOut()}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-20 h-16 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden w-10 h-10 -ml-2 inline-flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Menu className="w-5 h-5" aria-hidden="true" />
            </button>

            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="hidden sm:inline text-slate-400 dark:text-slate-500 whitespace-nowrap">
                Workspace
              </span>
              <span
                className="hidden sm:inline text-slate-300 dark:text-slate-700"
                aria-hidden="true"
              >
                /
              </span>
              <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                {SECTION_TITLES[activeSection]}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => void fetchTasks()}
              disabled={isLoading}
              aria-label="Refresh tasks"
              className="w-10 h-10 sm:w-auto sm:px-3 inline-flex items-center justify-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors disabled:opacity-60 whitespace-nowrap"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={
                theme === 'dark'
                  ? 'Switch to light mode'
                  : 'Switch to dark mode'
              }
              className="w-10 h-10 inline-flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" aria-hidden="true" />
              ) : (
                <Moon className="w-4 h-4" aria-hidden="true" />
              )}
            </button>

            <button
              type="button"
              onClick={() => openCreateModal(null)}
              className="h-10 px-3.5 sm:px-4 inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 rounded-xl shadow-xs transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span>Add Task</span>
            </button>
          </div>
        </header>

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
          {errorMessage && (
            <div
              role="alert"
              className="flex flex-wrap items-center justify-between gap-3 p-4 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-2xl text-sm text-rose-800 dark:text-rose-200"
            >
              <div className="flex items-start gap-2.5 min-w-0 flex-1">
                <AlertCircle
                  className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5"
                  aria-hidden="true"
                />
                <span className="break-words">{errorMessage}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => void fetchTasks()}
                  className="px-3 py-1.5 text-xs font-semibold text-rose-700 dark:text-rose-200 bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-700 hover:bg-rose-100 dark:hover:bg-rose-900/50 rounded-lg transition-colors whitespace-nowrap"
                >
                  Retry
                </button>
                <button
                  type="button"
                  onClick={() => setErrorMessage(null)}
                  aria-label="Dismiss error"
                  className="p-1.5 text-rose-600 dark:text-rose-300 hover:text-rose-800 rounded-md"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          )}

          {activeSection === 'dashboard' && (
            <DashboardView
              user={user}
              tasks={tasks}
              isLoading={isLoading}
              busyTaskIds={busyTaskIds}
              onOpenCreateModal={() => openCreateModal(null)}
              onEditTask={openEditModal}
              onToggleTask={handleToggleTask}
              onDeleteTask={handleDeleteTask}
              onNavigateWithFilter={handleNavigateWithFilter}
            />
          )}

          {activeSection === 'tasks' && (
            <TasksView
              tasks={tasks}
              isLoading={isLoading}
              busyTaskIds={busyTaskIds}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              sortOrder={sortOrder}
              onSortOrderChange={setSortOrder}
              onOpenCreateModal={() => openCreateModal(null)}
              onEditTask={openEditModal}
              onToggleTask={handleToggleTask}
              onDeleteTask={handleDeleteTask}
            />
          )}

          {activeSection === 'calendar' && (
            <CalendarView
              tasks={tasks}
              busyTaskIds={busyTaskIds}
              onOpenCreateModalForDate={(dateIso) => openCreateModal(dateIso)}
              onEditTask={openEditModal}
              onToggleTask={handleToggleTask}
              onDeleteTask={handleDeleteTask}
            />
          )}

          {activeSection === 'settings' && (
            <SettingsView
              user={user}
              theme={theme}
              onSetTheme={onSetTheme}
              defaultPriority={defaultPriority}
              onChangeDefaultPriority={setDefaultPriority}
              defaultSort={sortOrder}
              onChangeDefaultSort={setSortOrder}
              isSigningOut={isSigningOut}
              onSignOut={() => void handleSignOut()}
            />
          )}
        </main>
      </div>

      <TaskModal
        isOpen={modalOpen}
        editingTask={editingTask}
        defaultPriority={defaultPriority}
        initialDueDate={modalInitialDueDate}
        isSubmitting={isSavingModal}
        onClose={() => {
          if (!isSavingModal) setModalOpen(false);
        }}
        onSave={handleSaveTaskModal}
      />
    </div>
  );
}
