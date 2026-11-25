import { useState } from 'react';
import { motion } from 'motion/react';
import {
  AlertTriangle,
  Calendar,
  Check,
  Clock,
  Flag,
  Loader2,
  Pencil,
  Trash2,
} from 'lucide-react';
import {
  formatDueDateLabel,
  formatTimestamp,
  isTaskDueToday,
  isTaskOverdue,
} from '../lib/taskUtils';
import type { Task, TaskPriority } from '../types/task';

interface TaskCardProps {
  task: Task;
  isBusy: boolean;
  onToggle: (task: Task) => Promise<void>;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => Promise<void>;
}

const PRIORITY_STYLES: Record<
  TaskPriority,
  { label: string; badgeClass: string; iconClass: string }
> = {
  high: {
    label: 'High Priority',
    badgeClass:
      'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/80',
    iconClass: 'text-rose-600 dark:text-rose-400',
  },
  medium: {
    label: 'Medium',
    badgeClass:
      'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800/80',
    iconClass: 'text-indigo-600 dark:text-indigo-400',
  },
  low: {
    label: 'Low',
    badgeClass:
      'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    iconClass: 'text-slate-500 dark:text-slate-400',
  },
};

export function TaskCard({
  task,
  isBusy,
  onToggle,
  onEdit,
  onDelete,
}: TaskCardProps) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const overdue = isTaskOverdue(task);
  const dueToday = isTaskDueToday(task);
  const priorityStyle = PRIORITY_STYLES[task.priority];

  return (
    <motion.article
      layout="position"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
      className={`group rounded-2xl border bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-xs transition-all duration-150 ${
        task.is_completed
          ? 'border-slate-200/80 dark:border-slate-800/80 opacity-85'
          : overdue
            ? 'border-rose-200 dark:border-rose-900/70 hover:shadow-sm'
            : 'border-slate-200 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-800 hover:shadow-sm'
      }`}
    >
      <div className="flex items-start gap-3.5">
        <button
          type="button"
          onClick={() => void onToggle(task)}
          disabled={isBusy}
          aria-label={
            task.is_completed
              ? `Mark "${task.title}" as pending`
              : `Mark "${task.title}" as completed`
          }
          aria-pressed={task.is_completed}
          className="mt-0.5 w-10 h-10 -ml-2 -mt-1.5 flex items-center justify-center rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 disabled:opacity-60"
        >
          {isBusy ? (
            <Loader2
              className="w-4 h-4 text-indigo-600 dark:text-indigo-400 animate-spin"
              aria-hidden="true"
            />
          ) : (
            <span
              className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                task.is_completed
                  ? 'bg-indigo-600 border-indigo-600 text-white dark:bg-indigo-500 dark:border-indigo-500'
                  : 'bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-600 group-hover:border-indigo-500'
              }`}
            >
              {task.is_completed && (
                <Check className="w-3.5 h-3.5 stroke-[2.5]" aria-hidden="true" />
              )}
            </span>
          )}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h3
                className={`text-base font-semibold leading-snug break-words ${
                  task.is_completed
                    ? 'line-through text-slate-400 dark:text-slate-500'
                    : 'text-slate-900 dark:text-slate-100'
                }`}
              >
                {task.title}
              </h3>

              {task.description && (
                <p
                  className={`mt-1.5 text-sm whitespace-pre-line break-words leading-relaxed ${
                    task.is_completed
                      ? 'text-slate-400 dark:text-slate-500'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {task.description}
                </p>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-medium rounded-md border ${priorityStyle.badgeClass}`}
                >
                  <Flag className={`w-3 h-3 ${priorityStyle.iconClass}`} aria-hidden="true" />
                  <span>{priorityStyle.label}</span>
                </span>

                {task.due_date && (
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-medium rounded-md border tabular-nums ${
                      overdue
                        ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/80'
                        : dueToday
                          ? 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/80'
                          : 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                    }`}
                  >
                    {overdue ? (
                      <AlertTriangle className="w-3 h-3 text-rose-600 dark:text-rose-400" aria-hidden="true" />
                    ) : (
                      <Calendar className="w-3 h-3 opacity-75" aria-hidden="true" />
                    )}
                    <span>
                      {overdue
                        ? `Overdue · ${formatDueDateLabel(task.due_date)}`
                        : dueToday
                          ? `Due Today · ${formatDueDateLabel(task.due_date)}`
                          : `Due ${formatDueDateLabel(task.due_date)}`}
                    </span>
                  </span>
                )}

                <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                  <Clock className="w-3 h-3 opacity-70" aria-hidden="true" />
                  <span>
                    {task.is_completed
                      ? 'Completed'
                      : task.updated_at !== task.created_at
                        ? `Updated ${formatTimestamp(task.updated_at)}`
                        : `Added ${formatTimestamp(task.created_at)}`}
                  </span>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0 self-end sm:self-start">
              {confirmingDelete ? (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => void onDelete(task.id)}
                    disabled={isBusy}
                    className="h-9 px-3 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors disabled:opacity-60 whitespace-nowrap"
                  >
                    {isBusy ? 'Deleting...' : 'Confirm'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingDelete(false)}
                    disabled={isBusy}
                    className="h-9 px-3 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => onEdit(task)}
                    disabled={isBusy}
                    aria-label={`Edit "${task.title}"`}
                    className="h-9 px-2.5 inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-700 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap"
                  >
                    <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingDelete(true)}
                    disabled={isBusy}
                    aria-label={`Delete "${task.title}"`}
                    className="h-9 px-2.5 inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-rose-700 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap"
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Delete</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.article>
  );
}
