export type TaskPriority = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string;
  is_completed: boolean;
  priority: TaskPriority;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export type TaskFilter = 'all' | 'pending' | 'completed' | 'overdue';

export type TaskPriorityFilter = 'all' | TaskPriority;

export type TaskSort =
  | 'newest'
  | 'oldest'
  | 'due_asc'
  | 'priority_desc'
  | 'title_asc';

export type DashboardSection = 'dashboard' | 'tasks' | 'calendar' | 'settings';

export type ThemeMode = 'light' | 'dark';

export type ConnectionState =
  | 'checking'
  | 'unconfigured'
  | 'schema_missing'
  | 'error'
  | 'connected';

export interface SupabaseEnvStatus {
  hasValidUrl: boolean;
  hasValidKey: boolean;
}

export interface ConnectionCheckResult {
  state: ConnectionState;
  message: string;
  details?: string;
  env?: SupabaseEnvStatus;
}

export interface AuthUser {
  id: string;
  email: string;
}
