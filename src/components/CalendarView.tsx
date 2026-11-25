import { useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
} from 'lucide-react';
import {
  formatDueDateLabel,
  getTodayLocalIso,
  isTaskOverdue,
} from '../lib/taskUtils';
import type { Task } from '../types/task';
import { TaskCard } from './TaskCard';

interface CalendarViewProps {
  tasks: Task[];
  busyTaskIds: Record<string, boolean>;
  onOpenCreateModalForDate: (dateIso: string | null) => void;
  onEditTask: (task: Task) => void;
  onToggleTask: (task: Task) => Promise<void>;
  onDeleteTask: (taskId: string) => Promise<void>;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function toIsoDate(year: number, monthIndex: number, day: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function CalendarView({
  tasks,
  busyTaskIds,
  onOpenCreateModalForDate,
  onEditTask,
  onToggleTask,
  onDeleteTask,
}: CalendarViewProps) {
  const todayIso = getTodayLocalIso();
  const [todayYear, todayMonth] = todayIso.split('-').map(Number);

  const [cursor, setCursor] = useState<{ year: number; month: number }>({
    year: todayYear,
    month: todayMonth - 1,
  });
  const [selectedDate, setSelectedDate] = useState<string>(todayIso);

  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const task of tasks) {
      if (!task.due_date) continue;
      const existing = map.get(task.due_date);
      if (existing) {
        existing.push(task);
      } else {
        map.set(task.due_date, [task]);
      }
    }
    return map;
  }, [tasks]);

  const unscheduledTasks = useMemo(
    () => tasks.filter((task) => !task.due_date && !task.is_completed),
    [tasks]
  );

  const calendarCells = useMemo(() => {
    const firstDay = new Date(cursor.year, cursor.month, 1);
    const startWeekday = firstDay.getDay();
    const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();

    const cells: Array<{
      dateIso: string | null;
      dayNumber: number | null;
    }> = [];

    for (let i = 0; i < startWeekday; i += 1) {
      cells.push({ dateIso: null, dayNumber: null });
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      cells.push({
        dateIso: toIsoDate(cursor.year, cursor.month, day),
        dayNumber: day,
      });
    }
    while (cells.length % 7 !== 0) {
      cells.push({ dateIso: null, dayNumber: null });
    }
    return cells;
  }, [cursor]);

  const monthLabel = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(cursor.year, cursor.month, 1));

  const goPrevMonth = () => {
    setCursor((prev) =>
      prev.month === 0
        ? { year: prev.year - 1, month: 11 }
        : { year: prev.year, month: prev.month - 1 }
    );
  };

  const goNextMonth = () => {
    setCursor((prev) =>
      prev.month === 11
        ? { year: prev.year + 1, month: 0 }
        : { year: prev.year, month: prev.month + 1 }
    );
  };

  const goToday = () => {
    setCursor({ year: todayYear, month: todayMonth - 1 });
    setSelectedDate(todayIso);
  };

  const selectedDayTasks = tasksByDate.get(selectedDate) ?? [];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Calendar
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            View tasks by due date or select a day to schedule work
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-1">
            <button
              type="button"
              onClick={goPrevMonth}
              aria-label="Previous month"
              className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            </button>
            <span className="px-3 text-xs font-semibold text-slate-900 dark:text-slate-100 min-w-[130px] text-center">
              {monthLabel}
            </span>
            <button
              type="button"
              onClick={goNextMonth}
              aria-label="Next month"
              className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition-colors"
            >
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          <button
            type="button"
            onClick={goToday}
            className="h-10 px-3.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors whitespace-nowrap"
          >
            Today
          </button>

          <button
            type="button"
            onClick={() => onOpenCreateModalForDate(selectedDate)}
            className="h-10 px-4 inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 rounded-xl shadow-xs transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>Add Task</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Monthly Grid */}
        <section
          aria-label="Monthly task calendar"
          className="xl:col-span-7 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs"
        >
          <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60">
            {WEEKDAYS.map((day) => (
              <div
                key={day}
                className="py-2.5 text-center text-[11px] font-semibold text-slate-500 dark:text-slate-400"
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 dark:divide-slate-800/80">
            {calendarCells.map((cell, index) => {
              if (!cell.dateIso || cell.dayNumber === null) {
                return (
                  <div
                    key={`empty-${index}`}
                    className="min-h-[76px] sm:min-h-[92px] bg-slate-50/40 dark:bg-slate-950/30"
                  />
                );
              }

              const dayTasks = tasksByDate.get(cell.dateIso) ?? [];
              const isSelected = selectedDate === cell.dateIso;
              const isToday = todayIso === cell.dateIso;
              const hasOverdue = dayTasks.some((t) =>
                isTaskOverdue(t, todayIso)
              );

              return (
                <button
                  key={cell.dateIso}
                  type="button"
                  onClick={() => setSelectedDate(cell.dateIso!)}
                  aria-label={`${formatDueDateLabel(cell.dateIso)}, ${dayTasks.length} tasks`}
                  aria-pressed={isSelected}
                  className={`min-h-[76px] sm:min-h-[92px] p-1.5 sm:p-2 text-left flex flex-col justify-between transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-600 ${
                    isSelected
                      ? 'bg-indigo-50/80 dark:bg-indigo-950/50'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 w-full">
                    <span
                      className={`w-6 h-6 inline-flex items-center justify-center rounded-lg text-xs font-semibold tabular-nums ${
                        isToday
                          ? 'bg-indigo-600 text-white dark:bg-indigo-500'
                          : isSelected
                            ? 'text-indigo-700 dark:text-indigo-300'
                            : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {cell.dayNumber}
                    </span>

                    {dayTasks.length > 0 && (
                      <span
                        className={`text-[10px] font-mono tabular-nums px-1.5 py-0.5 rounded ${
                          hasOverdue
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                            : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                        }`}
                      >
                        {dayTasks.length}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 mt-1 w-full overflow-hidden">
                    {dayTasks.slice(0, 2).map((t) => (
                      <div
                        key={t.id}
                        className={`truncate text-[10px] font-medium px-1.5 py-0.5 rounded ${
                          t.is_completed
                            ? 'bg-slate-100 text-slate-400 line-through dark:bg-slate-800 dark:text-slate-500'
                            : isTaskOverdue(t, todayIso)
                              ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300'
                              : 'bg-blue-50 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300'
                        }`}
                      >
                        {t.title}
                      </div>
                    ))}
                    {dayTasks.length > 2 && (
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 px-1 tabular-nums">
                        +{dayTasks.length - 2} more
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Selected Date + Unscheduled Tasks */}
        <div className="xl:col-span-5 space-y-6">
          <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {selectedDate === todayIso
                    ? `Today · ${formatDueDateLabel(selectedDate)}`
                    : formatDueDateLabel(selectedDate)}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                  {selectedDayTasks.length}{' '}
                  {selectedDayTasks.length === 1 ? 'task' : 'tasks'} scheduled
                </p>
              </div>

              <button
                type="button"
                onClick={() => onOpenCreateModalForDate(selectedDate)}
                className="h-9 px-3 inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 rounded-lg transition-colors whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Schedule</span>
              </button>
            </div>

            {selectedDayTasks.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 py-6 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                No tasks due on {formatDueDateLabel(selectedDate)}.
              </p>
            ) : (
              <div className="space-y-3">
                {selectedDayTasks.map((task) => (
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

          <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Unscheduled Pending Tasks
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Tasks without a due date
                </p>
              </div>
              <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                {unscheduledTasks.length}
              </span>
            </div>

            {unscheduledTasks.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 py-4 text-center">
                All pending tasks have due dates assigned.
              </p>
            ) : (
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {unscheduledTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50"
                  >
                    <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                      {task.title}
                    </span>
                    <button
                      type="button"
                      onClick={() => onEditTask(task)}
                      className="px-2.5 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 rounded-lg transition-colors whitespace-nowrap shrink-0"
                    >
                      Set date
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
