import { useMemo, useState } from 'react';
import {
  ArrowUpDown,
  Filter,
  Plus,
  Search,
  X,
} from 'lucide-react';
import { getTodayLocalIso, isTaskOverdue, sortTasks } from '../lib/taskUtils';
import type {
  Task,
  TaskFilter,
  TaskPriorityFilter,
  TaskSort,
} from '../types/task';
import { TaskCard } from './TaskCard';

interface TasksViewProps {
  tasks: Task[];
  isLoading: boolean;
  busyTaskIds: Record<string, boolean>;
  statusFilter: TaskFilter;
  onStatusFilterChange: (filter: TaskFilter) => void;
  sortOrder: TaskSort;
  onSortOrderChange: (sort: TaskSort) => void;
  onOpenCreateModal: () => void;
  onEditTask: (task: Task) => void;
  onToggleTask: (task: Task) => Promise<void>;
  onDeleteTask: (taskId: string) => Promise<void>;
}

export function TasksView({
  tasks,
  isLoading,
  busyTaskIds,
  statusFilter,
  onStatusFilterChange,
  sortOrder,
  onSortOrderChange,
  onOpenCreateModal,
  onEditTask,
  onToggleTask,
  onDeleteTask,
}: TasksViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] =
    useState<TaskPriorityFilter>('all');

  const todayIso = getTodayLocalIso();

  const counts = useMemo(() => {
    let completed = 0;
    let overdue = 0;
    for (const task of tasks) {
      if (task.is_completed) completed += 1;
      else if (isTaskOverdue(task, todayIso)) overdue += 1;
    }
    return {
      all: tasks.length,
      pending: tasks.length - completed,
      completed,
      overdue,
    };
  }, [tasks, todayIso]);

  const visibleTasks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const filtered = tasks.filter((task) => {
      if (statusFilter === 'pending' && task.is_completed) return false;
      if (statusFilter === 'completed' && !task.is_completed) return false;
      if (statusFilter === 'overdue' && !isTaskOverdue(task, todayIso)) {
        return false;
      }
      if (priorityFilter !== 'all' && task.priority !== priorityFilter) {
        return false;
      }
      if (query) {
        return (
          task.title.toLowerCase().includes(query) ||
          task.description.toLowerCase().includes(query)
        );
      }
      return true;
    });
    return sortTasks(filtered, sortOrder);
  }, [tasks, statusFilter, priorityFilter, searchQuery, sortOrder, todayIso]);

  const completionPercent =
    counts.all > 0 ? Math.round((counts.completed / counts.all) * 100) : 0;

  const hasActiveFilters =
    statusFilter !== 'all' ||
    priorityFilter !== 'all' ||
    searchQuery.trim() !== '';

  return (
    <div className="space-y-6">
      {/* Header + Progress Strip */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              My Tasks
            </h1>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              {counts.completed} of {counts.all} completed ({completionPercent}%)
              {counts.overdue > 0 ? ` · ${counts.overdue} overdue` : ''}
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenCreateModal}
            className="self-start sm:self-auto h-10 px-4 inline-flex items-center gap-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 rounded-xl shadow-xs transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>Add Task</span>
          </button>
        </div>

        <div
          className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden"
          role="progressbar"
          aria-valuenow={completionPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Task completion progress"
        >
          <div
            style={{ width: `${completionPercent}%` }}
            className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-blue-500 transition-all duration-300"
          />
        </div>
      </div>

      {/* Controls: Filter Tabs, Search, Priority Filter, Sort */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-3">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
          <div
            className="inline-flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl self-start"
            role="tablist"
            aria-label="Filter tasks by status"
          >
            {(
              [
                { key: 'all', label: 'All', count: counts.all },
                { key: 'pending', label: 'Pending', count: counts.pending },
                { key: 'completed', label: 'Completed', count: counts.completed },
                { key: 'overdue', label: 'Overdue', count: counts.overdue },
              ] as const
            ).map((tab) => {
              const active = statusFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => onStatusFilterChange(tab.key)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`ml-1.5 font-mono tabular-nums ${
                      tab.key === 'overdue' && tab.count > 0
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="relative flex-1 sm:w-56">
              <Search
                className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search title or notes..."
                aria-label="Search tasks"
                className="w-full h-10 pl-9 pr-8 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                >
                  <X className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              )}
            </div>

            <div className="relative">
              <Filter
                className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <select
                value={priorityFilter}
                onChange={(e) =>
                  setPriorityFilter(e.target.value as TaskPriorityFilter)
                }
                aria-label="Filter by priority"
                className="w-full sm:w-auto h-10 pl-8 pr-8 text-xs font-medium bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20"
              >
                <option value="all">All Priorities</option>
                <option value="high">High Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="low">Low Priority</option>
              </select>
            </div>

            <div className="relative">
              <ArrowUpDown
                className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <select
                value={sortOrder}
                onChange={(e) => onSortOrderChange(e.target.value as TaskSort)}
                aria-label="Sort tasks"
                className="w-full sm:w-auto h-10 pl-8 pr-8 text-xs font-medium bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="due_asc">Due Date (Earliest)</option>
                <option value="priority_desc">Priority (High to Low)</option>
                <option value="title_asc">Title (A–Z)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Task Cards List */}
      {isLoading ? (
        <div className="space-y-3" aria-label="Loading tasks">
          {[0, 1, 2, 3].map((skeleton) => (
            <div
              key={skeleton}
              className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 animate-pulse"
            >
              <div className="flex items-start gap-3.5">
                <div className="w-5 h-5 rounded-md bg-slate-200 dark:bg-slate-800 mt-1 shrink-0" />
                <div className="flex-1 space-y-2.5">
                  <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />
                  <div className="h-3.5 bg-slate-100 dark:bg-slate-800/70 rounded w-4/5" />
                  <div className="h-5 bg-slate-100 dark:bg-slate-800/70 rounded w-36" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : visibleTasks.length === 0 ? (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-6 py-14 text-center shadow-xs">
          <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
            {tasks.length === 0
              ? 'No tasks yet'
              : 'No tasks match your current filters'}
          </p>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            {tasks.length === 0
              ? 'Click Add Task to create your first task and save it permanently in Supabase.'
              : 'Try adjusting your search text, priority filter, or status tab.'}
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => {
                  onStatusFilterChange('all');
                  setPriorityFilter('all');
                  setSearchQuery('');
                }}
                className="h-10 px-4 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 rounded-xl transition-colors whitespace-nowrap"
              >
                Reset Filters
              </button>
            )}
            <button
              type="button"
              onClick={onOpenCreateModal}
              className="h-10 px-4 inline-flex items-center gap-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors whitespace-nowrap"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span>Add Task</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleTasks.map((task) => (
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
    </div>
  );
}
