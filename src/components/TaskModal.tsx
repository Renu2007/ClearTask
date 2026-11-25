import { useEffect, useRef, useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Calendar, Flag, Loader2, X } from 'lucide-react';
import { addDaysLocalIso, getTodayLocalIso } from '../lib/taskUtils';
import type { Task, TaskPriority } from '../types/task';

interface TaskModalProps {
  isOpen: boolean;
  editingTask: Task | null;
  defaultPriority: TaskPriority;
  initialDueDate?: string | null;
  isSubmitting: boolean;
  onClose: () => void;
  onSave: (payload: {
    title: string;
    description: string;
    priority: TaskPriority;
    due_date: string | null;
  }) => Promise<boolean>;
}

const PRIORITIES: Array<{
  value: TaskPriority;
  label: string;
  activeClass: string;
}> = [
  {
    value: 'low',
    label: 'Low',
    activeClass:
      'bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:border-slate-100',
  },
  {
    value: 'medium',
    label: 'Medium',
    activeClass:
      'bg-indigo-600 text-white border-indigo-600 dark:bg-indigo-500 dark:border-indigo-500',
  },
  {
    value: 'high',
    label: 'High',
    activeClass:
      'bg-rose-600 text-white border-rose-600 dark:bg-rose-600 dark:border-rose-600',
  },
];

export function TaskModal({
  isOpen,
  editingTask,
  defaultPriority,
  initialDueDate,
  isSubmitting,
  onClose,
  onSave,
}: TaskModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>(defaultPriority);
  const [dueDate, setDueDate] = useState<string>('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (editingTask) {
      setTitle(editingTask.title);
      setDescription(editingTask.description);
      setPriority(editingTask.priority);
      setDueDate(editingTask.due_date ?? '');
    } else {
      setTitle('');
      setDescription('');
      setPriority(defaultPriority);
      setDueDate(initialDueDate ?? '');
    }
    setValidationError(null);

    const timer = window.setTimeout(() => {
      titleInputRef.current?.focus();
    }, 60);
    return () => window.clearTimeout(timer);
  }, [isOpen, editingTask, defaultPriority, initialDueDate]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setValidationError('Please enter a task title.');
      titleInputRef.current?.focus();
      return;
    }

    setValidationError(null);
    const ok = await onSave({
      title: trimmedTitle,
      description: description.trim(),
      priority,
      due_date: dueDate ? dueDate : null,
    });
    if (ok) {
      onClose();
    }
  };

  const todayIso = getTodayLocalIso();
  const tomorrowIso = addDaysLocalIso(1);
  const nextWeekIso = addDaysLocalIso(7);

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="task-modal-title"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            onClick={() => {
              if (!isSubmitting) onClose();
            }}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs dark:bg-slate-950/75"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
              <div>
                <h2
                  id="task-modal-title"
                  className="text-base font-bold text-slate-900 dark:text-slate-100"
                >
                  {editingTask ? 'Edit Task' : 'Create New Task'}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {editingTask
                    ? 'Update details and save directly to Supabase.'
                    : 'Add a task with priority and due date to your workspace.'}
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                aria-label="Close modal"
                className="w-9 h-9 inline-flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5" noValidate>
              <div>
                <label
                  htmlFor="modal-task-title"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Task Title <span className="text-indigo-600 dark:text-indigo-400">*</span>
                </label>
                <input
                  ref={titleInputRef}
                  id="modal-task-title"
                  type="text"
                  maxLength={160}
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (validationError) setValidationError(null);
                  }}
                  disabled={isSubmitting}
                  placeholder="e.g., Finalize Q4 product roadmap"
                  className="w-full h-11 px-3.5 text-sm bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 disabled:opacity-60"
                />
                {validationError && (
                  <p role="alert" className="mt-1.5 text-xs font-medium text-rose-600 dark:text-rose-400">
                    {validationError}
                  </p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="modal-task-description"
                    className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                  >
                    Description
                  </label>
                  <span className="text-[11px] font-mono tabular-nums text-slate-400 dark:text-slate-500">
                    {description.length}/1000
                  </span>
                </div>
                <textarea
                  id="modal-task-description"
                  rows={3}
                  maxLength={1000}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isSubmitting}
                  placeholder="Add notes, acceptance criteria, or links (optional)"
                  className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 resize-y min-h-[88px] focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 disabled:opacity-60"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    <Flag className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                    <span>Priority</span>
                  </span>
                  <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="Task priority">
                    {PRIORITIES.map((item) => {
                      const active = priority === item.value;
                      return (
                        <button
                          key={item.value}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          disabled={isSubmitting}
                          onClick={() => setPriority(item.value)}
                          className={`h-10 px-2.5 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap ${
                            active
                              ? item.activeClass
                              : 'bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                          }`}
                        >
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="modal-task-due-date"
                    className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
                  >
                    <Calendar className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                    <span>Due Date</span>
                  </label>
                  <input
                    id="modal-task-due-date"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full h-10 px-3 text-sm bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 disabled:opacity-60"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-slate-500 dark:text-slate-400 mr-1">
                  Quick date:
                </span>
                {[
                  { label: 'Today', value: todayIso },
                  { label: 'Tomorrow', value: tomorrowIso },
                  { label: 'Next Week', value: nextWeekIso },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => setDueDate(preset.value)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-colors whitespace-nowrap ${
                      dueDate === preset.value
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-700'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
                {dueDate && (
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => setDueDate('')}
                    className="px-2.5 py-1 text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 rounded-md transition-colors whitespace-nowrap"
                  >
                    Clear
                  </button>
                )}
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="h-10 px-4 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors whitespace-nowrap"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-10 px-5 inline-flex items-center justify-center gap-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 rounded-xl shadow-xs transition-colors disabled:opacity-60 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
                >
                  {isSubmitting && (
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  )}
                  <span>
                    {isSubmitting
                      ? 'Saving...'
                      : editingTask
                        ? 'Save Changes'
                        : 'Create Task'}
                  </span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
