import { useMemo } from 'react';
import { motion } from 'motion/react';
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  Layers,
  Plus,
} from 'lucide-react';
import {
  getDisplayNameFromEmail,
  getGreeting,
  getTodayLocalIso,
  isTaskOverdue,
  sortTasks,
} from '../lib/taskUtils';
import type { AuthUser, DashboardSection, Task, TaskFilter } from '../types/task';
import { TaskCard } from './TaskCard';

interface DashboardViewProps {
  user: AuthUser;
  tasks: Task[];
  isLoading: boolean;
  busyTaskIds: Record<string, boolean>;
  onOpenCreateModal: () => void;
  onEditTask: (task: Task) => void;
  onToggleTask: (task: Task) => Promise<void>;
  onDeleteTask: (taskId: string) => Promise<void>;
  onNavigateWithFilter: (section: DashboardSection, filter?: TaskFilter) => void;
}

export function DashboardView({
  user,
  tasks,
  isLoading,
  busyTaskIds,
  onOpenCreateModal,
  onEditTask,
  onToggleTask,
  onDeleteTask,
  onNavigateWithFilter,
}: DashboardViewProps) {
  const todayIso = getTodayLocalIso();

  const stats = useMemo(() => {
    let completed = 0;
    let overdue = 0;
    let highPriorityPending = 0;
    let mediumPriorityPending = 0;
    let lowPriorityPending = 0;

    for (const task of tasks) {
      if (task.is_completed) {
        completed += 1;
      } else {
        if (isTaskOverdue(task, todayIso)) {
          overdue += 1;
        }
        if (task.priority === 'high') highPriorityPending += 1;
        else if (task.priority === 'medium') mediumPriorityPending += 1;
        else lowPriorityPending += 1;
      }
    }

    const total = tasks.length;
    const pending = total - completed;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      total,
      completed,
      pending,
      overdue,
      completionRate,
      highPriorityPending,
      mediumPriorityPending,
      lowPriorityPending,
    };
  }, [tasks, todayIso]);

  const priorityFocusTasks = useMemo(() => {
    const pending = tasks.filter((t) => !t.is_completed);
    return sortTasks(pending, 'due_asc').slice(0, 5);
  }, [tasks]);

  const formattedDate = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date());

  const summaryCards: Array<{
    label: string;
    value: number;
    subtext: string;
    filter: TaskFilter;
    icon: typeof Layers;
    accentBg: string;
    accentText: string;
  }> = [
    {
      label: 'Total Tasks',
      value: stats.total,
      subtext: 'All saved tasks',
      filter: 'all',
      icon: Layers,
      accentBg: 'bg-indigo-50 dark:bg-indigo-950/70',
      accentText: 'text-indigo-600 dark:text-indigo-400',
    },
    {
      label: 'Completed',
      value: stats.completed,
      subtext: `${stats.completionRate}% completion rate`,
      filter: 'completed',
      icon: CheckCircle2,
      accentBg: 'bg-emerald-50 dark:bg-emerald-950/60',
      accentText: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      label: 'Pending',
      value: stats.pending,
      subtext: 'Remaining to finish',
      filter: 'pending',
      icon: Clock,
      accentBg: 'bg-blue-50 dark:bg-blue-950/70',
      accentText: 'text-blue-600 dark:text-blue-400',
    },
    {
      label: 'Overdue',
      value: stats.overdue,
      subtext: stats.overdue > 0 ? 'Needs attention' : 'All on schedule',
      filter: 'overdue',
      icon: AlertTriangle,
      accentBg:
        stats.overdue > 0
          ? 'bg-rose-50 dark:bg-rose-950/60'
          : 'bg-slate-100 dark:bg-slate-800',
      accentText:
        stats.overdue > 0
          ? 'text-rose-600 dark:text-rose-400'
          : 'text-slate-500 dark:text-slate-400',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div>
            <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
              {formattedDate}
            </p>
            <h1 className="mt-1.5 text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight text-balance">
              {getGreeting()}, {getDisplayNameFromEmail(user.email)}
            </h1>
            <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
              {stats.total === 0
                ? 'Your workspace is ready. Create your first task to start tracking progress.'
                : stats.pending === 0
                  ? 'Every task in your workspace is completed. Add a new task whenever you are ready.'
                  : `You have ${stats.pending} pending ${stats.pending === 1 ? 'task' : 'tasks'}${
                      stats.overdue > 0
                        ? ` (${stats.overdue} overdue)`
                        : ''
                    } synced with Supabase.`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => onNavigateWithFilter('calendar')}
              className="h-10 px-4 inline-flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors whitespace-nowrap"
            >
              <Calendar className="w-4 h-4" aria-hidden="true" />
              <span>Calendar</span>
            </button>
            <button
              type="button"
              onClick={onOpenCreateModal}
              className="h-10 px-4 inline-flex items-center gap-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 rounded-xl shadow-xs transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span>Add Task</span>
            </button>
          </div>
        </div>
      </section>

      {/* 4 Summary Cards */}
      <section
        aria-label="Task summary statistics"
        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"
      >
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.label}
              type="button"
              onClick={() => onNavigateWithFilter('tasks', card.filter)}
              className="text-left rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-xs hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-sm transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {card.label}
                </span>
                <span
                  className={`w-9 h-9 rounded-xl inline-flex items-center justify-center ${card.accentBg} ${card.accentText}`}
                >
                  <Icon className="w-4 h-4" aria-hidden="true" />
                </span>
              </div>
              <p className="mt-3 text-3xl font-bold text-slate-900 dark:text-slate-100 tabular-nums tracking-tight">
                {card.value}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {card.subtext}
              </p>
            </button>
          );
        })}
      </section>

      {/* Completion Progress + Priority Distribution */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Task Completion Progress
                </h2>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  Real-time progress across all tasks in your account
                </p>
              </div>
              <span className="text-2xl font-bold font-mono tabular-nums text-indigo-600 dark:text-indigo-400">
                {stats.completionRate}%
              </span>
            </div>

            <div
              className="mt-5 h-3 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden"
              role="progressbar"
              aria-valuenow={stats.completionRate}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Overall task completion percentage"
            >
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${stats.completionRate}%` }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-blue-500 dark:from-indigo-500 dark:to-blue-400"
              />
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-400 tabular-nums">
            <span>
              <strong className="font-semibold text-slate-900 dark:text-slate-100">
                {stats.completed}
              </strong>{' '}
              completed of{' '}
              <strong className="font-semibold text-slate-900 dark:text-slate-100">
                {stats.total}
              </strong>{' '}
              total tasks
            </span>
            <button
              type="button"
              onClick={() => onNavigateWithFilter('tasks', 'all')}
              className="inline-flex items-center gap-1 font-semibold text-indigo-600 dark:text-indigo-400 hover:underline whitespace-nowrap"
            >
              <span>Manage all tasks</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="lg:col-span-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xs">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Pending by Priority
          </h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Active workload breakdown
          </p>

          <div className="mt-5 space-y-3.5">
            {[
              {
                label: 'High Priority',
                count: stats.highPriorityPending,
                barClass: 'bg-rose-500',
              },
              {
                label: 'Medium Priority',
                count: stats.mediumPriorityPending,
                barClass: 'bg-indigo-500',
              },
              {
                label: 'Low Priority',
                count: stats.lowPriorityPending,
                barClass: 'bg-slate-400 dark:bg-slate-500',
              },
            ].map((row) => {
              const pct =
                stats.pending > 0
                  ? Math.round((row.count / stats.pending) * 100)
                  : 0;
              return (
                <div key={row.label} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {row.label}
                    </span>
                    <span className="font-mono tabular-nums text-slate-600 dark:text-slate-400">
                      {row.count}
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      style={{ width: `${pct}%` }}
                      className={`h-full rounded-full transition-all duration-300 ${row.barClass}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Priority & Upcoming Tasks */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Up Next
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Pending tasks ordered by earliest due date and priority
            </p>
          </div>

          <button
            type="button"
            onClick={() => onNavigateWithFilter('tasks', 'pending')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline whitespace-nowrap"
          >
            <span>View all pending</span>
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>

        {isLoading ? (
          <div className="space-y-3" aria-label="Loading upcoming tasks">
            {[0, 1, 2].map((skeleton) => (
              <div
                key={skeleton}
                className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 animate-pulse"
              >
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/3" />
                <div className="mt-3 h-3 bg-slate-100 dark:bg-slate-800/60 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : priorityFocusTasks.length === 0 ? (
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-6 py-12 text-center shadow-xs">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {stats.total === 0 ? 'No tasks created yet' : 'No pending tasks'}
            </p>
            <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              {stats.total === 0
                ? 'Click Add Task to create your first task with a priority and optional due date.'
                : 'You have completed all your active tasks.'}
            </p>
            <button
              type="button"
              onClick={onOpenCreateModal}
              className="mt-4 h-10 px-4 inline-flex items-center gap-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span>Add Task</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {priorityFocusTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                isBusy={Boolean(busyTaskIds[task.id])}
                onToggle={onToggleTask}
                onEdit={onEditTask}
                onDelete={onDeleteTask}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
