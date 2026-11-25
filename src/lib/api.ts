import type {
  AuthUser,
  ConnectionCheckResult,
  Task,
  TaskPriority,
} from '../types/task';

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => ({}))) as {
    error?: string;
    code?: string;
  } & T;

  if (!response.ok) {
    throw new ApiError(
      payload.error ?? `Request failed (${response.status})`,
      response.status,
      payload.code
    );
  }

  return payload;
}

export async function checkSupabaseConnection(): Promise<ConnectionCheckResult> {
  try {
    const response = await fetch('/api/health', {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    return await parseJsonResponse<ConnectionCheckResult>(response);
  } catch (err) {
    return {
      state: 'error',
      message: 'Could not reach the ClearTask backend server.',
      details: err instanceof Error ? err.message : 'Network request failed',
    };
  }
}

export async function signInWithEmail(
  email: string,
  password: string
): Promise<{ user: AuthUser; accessToken: string }> {
  const response = await fetch('/api/auth/signin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return parseJsonResponse<{ user: AuthUser; accessToken: string }>(response);
}

export async function signUpWithEmail(
  email: string,
  password: string
): Promise<{
  user: AuthUser;
  accessToken: string | null;
  needsEmailConfirmation: boolean;
}> {
  const response = await fetch('/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return parseJsonResponse<{
    user: AuthUser;
    accessToken: string | null;
    needsEmailConfirmation: boolean;
  }>(response);
}

export async function signOutSession(accessToken: string): Promise<void> {
  const response = await fetch('/api/auth/signout', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  await parseJsonResponse<{ ok: boolean }>(response);
}

export async function fetchUserTasks(accessToken: string): Promise<Task[]> {
  const response = await fetch('/api/tasks', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const data = await parseJsonResponse<{ tasks: Task[] }>(response);
  return data.tasks;
}

export async function createUserTask(
  accessToken: string,
  input: {
    title: string;
    description: string;
    priority: TaskPriority;
    due_date: string | null;
  }
): Promise<Task> {
  const response = await fetch('/api/tasks', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(input),
  });
  const data = await parseJsonResponse<{ task: Task }>(response);
  return data.task;
}

export async function updateUserTask(
  accessToken: string,
  taskId: string,
  patch: {
    title?: string;
    description?: string;
    is_completed?: boolean;
    priority?: TaskPriority;
    due_date?: string | null;
  }
): Promise<Task> {
  const response = await fetch(`/api/tasks/${encodeURIComponent(taskId)}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(patch),
  });
  const data = await parseJsonResponse<{ task: Task }>(response);
  return data.task;
}

export async function deleteUserTask(
  accessToken: string,
  taskId: string
): Promise<void> {
  const response = await fetch(`/api/tasks/${encodeURIComponent(taskId)}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  await parseJsonResponse<{ ok: boolean }>(response);
}
