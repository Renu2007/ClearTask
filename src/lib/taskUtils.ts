import type { Task, TaskPriority, TaskSort } from '../types/task';

export function getTodayLocalIso(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDaysLocalIso(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isTaskOverdue(task: Task, todayIso = getTodayLocalIso()): boolean {
  if (task.is_completed || !task.due_date) return false;
  return task.due_date < todayIso;
}

export function isTaskDueToday(task: Task, todayIso = getTodayLocalIso()): boolean {
  if (task.is_completed || !task.due_date) return false;
  return task.due_date === todayIso;
}

export function formatDueDateLabel(dueDate: string): string {
  const [y, m, d] = dueDate.split('-').map(Number);
  if (!y || !m || !d) return dueDate;
  const date = new Date(y, m - 1, d);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: y !== new Date().getFullYear() ? 'numeric' : undefined,
  }).format(date);
}

export function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

const PRIORITY_RANK: Record<TaskPriority, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

export function sortTasks(tasks: Task[], sort: TaskSort): Task[] {
  const copy = [...tasks];
  copy.sort((a, b) => {
    switch (sort) {
      case 'oldest':
        return a.created_at.localeCompare(b.created_at);
      case 'due_asc': {
        if (a.due_date && b.due_date) {
          const cmp = a.due_date.localeCompare(b.due_date);
          if (cmp !== 0) return cmp;
        } else if (a.due_date) {
          return -1;
        } else if (b.due_date) {
          return 1;
        }
        return PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority];
      }
      case 'priority_desc': {
        const rankDiff = PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority];
        if (rankDiff !== 0) return rankDiff;
        return b.created_at.localeCompare(a.created_at);
      }
      case 'title_asc':
        return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
      case 'newest':
      default:
        return b.created_at.localeCompare(a.created_at);
    }
  });
  return copy;
}

export function getGreeting(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export function getDisplayNameFromEmail(email: string): string {
  const local = email.split('@')[0] ?? 'there';
  const cleaned = local.replace(/[._-]+/g, ' ').trim();
  if (!cleaned) return 'there';
  return cleaned
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
