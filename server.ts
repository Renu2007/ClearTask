import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express, { type Request, type Response } from 'express';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const VALID_PRIORITIES = new Set(['low', 'medium', 'high']);
const TASK_BASE_SELECT =
  'id, user_id, title, description, is_completed, created_at, updated_at';
const TASK_EXTENDED_SELECT =
  'id, user_id, title, description, is_completed, priority, due_date, created_at, updated_at';
const META_SUFFIX_REGEX = /\n*<!--ct:(\{[^\n]*\})-->$/;

type TaskPriority = 'low' | 'medium' | 'high';

interface RawTaskRow {
  id: string;
  user_id: string;
  title: string;
  description: string;
  is_completed: boolean;
  priority?: string | null;
  due_date?: string | null;
  created_at: string;
  updated_at: string;
}

function normalizePriority(value: unknown): TaskPriority {
  if (typeof value === 'string' && VALID_PRIORITIES.has(value)) {
    return value as TaskPriority;
  }
  return 'medium';
}

function normalizeDueDate(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!DATE_REGEX.test(trimmed)) return null;
  return trimmed;
}

function stripTaskMeta(description: string): string {
  return description.replace(META_SUFFIX_REGEX, '').trimEnd();
}

function encodeDescriptionWithMeta(
  cleanDescription: string,
  priority: TaskPriority,
  dueDate: string | null
): string {
  const clean = stripTaskMeta(cleanDescription);
  if (priority === 'medium' && !dueDate) {
    return clean;
  }
  const meta: { p?: TaskPriority; d?: string } = {};
  if (priority !== 'medium') meta.p = priority;
  if (dueDate) meta.d = dueDate;
  const tag = `<!--ct:${JSON.stringify(meta)}-->`;
  return clean ? `${clean}\n${tag}` : tag;
}

function decodeTaskRow(row: RawTaskRow) {
  const rawDesc = typeof row.description === 'string' ? row.description : '';
  const match = META_SUFFIX_REGEX.exec(rawDesc);
  let metaPriority: TaskPriority = 'medium';
  let metaDueDate: string | null = null;

  if (match) {
    try {
      const parsed = JSON.parse(match[1]) as { p?: unknown; d?: unknown };
      metaPriority = normalizePriority(parsed.p);
      metaDueDate = normalizeDueDate(parsed.d);
    } catch {
      // Ignore malformed metadata comment and preserve text
    }
  }

  const priority =
    row.priority !== undefined && row.priority !== null
      ? normalizePriority(row.priority)
      : metaPriority;
  const dueDate =
    row.due_date !== undefined ? normalizeDueDate(row.due_date) : metaDueDate;

  return {
    id: row.id,
    user_id: row.user_id,
    title: row.title,
    description: match ? stripTaskMeta(rawDesc) : rawDesc,
    is_completed: Boolean(row.is_completed),
    priority,
    due_date: dueDate,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function isMissingColumnError(error: {
  code?: string;
  message?: string;
} | null): boolean {
  if (!error) return false;
  const code = error.code ?? '';
  const msg = (error.message ?? '').toLowerCase();
  return (
    code === '42703' ||
    code === 'PGRST204' ||
    (msg.includes('column') && msg.includes('does not exist')) ||
    msg.includes('could not find the')
  );
}

let hasExtendedTaskColumns: boolean | null = null;

async function detectExtendedTaskColumns(
  client: SupabaseClient
): Promise<boolean> {
  if (hasExtendedTaskColumns !== null) return hasExtendedTaskColumns;
  const { error } = await client
    .from('tasks')
    .select('priority, due_date')
    .limit(1);
  if (!error) {
    hasExtendedTaskColumns = true;
    return true;
  }
  if (isMissingColumnError(error)) {
    hasExtendedTaskColumns = false;
    return false;
  }
  return false;
}

function isPlaceholder(value: string): boolean {
  if (!value) return true;
  const upper = value.toUpperCase();
  return (
    upper.startsWith('MY_') ||
    upper.includes('YOUR_PROJECT') ||
    upper.includes('YOUR-PROJECT') ||
    upper.includes('PLACEHOLDER')
  );
}

function isValidHttpUrl(value: string): boolean {
  if (isPlaceholder(value)) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

function cleanEnvValue(value: string | undefined): string {
  return (value ?? '').trim().replace(/^["']+|["']+$/g, '').trim();
}

function firstNonEmpty(...values: Array<string | undefined>): string {
  for (const raw of values) {
    const cleaned = cleanEnvValue(raw);
    if (cleaned.length > 0) return cleaned;
  }
  return '';
}

function classifyKeyFormat(key: string): string {
  if (!key) return 'empty';
  if (key.startsWith('sb_publishable_')) return 'sb_publishable';
  if (key.startsWith('sb_secret_')) return 'sb_secret';
  if (key.startsWith('sbp_')) return 'personal_access_token';
  if (key.startsWith('eyJ')) return 'jwt';
  return 'unknown';
}

function getSupabaseEnv() {
  const url = firstNonEmpty(
    process.env.SUPABASE_URL,
    process.env.VITE_SUPABASE_URL
  );
  const publishableKey = firstNonEmpty(
    process.env.SUPABASE_PUBLISHABLE_KEY,
    process.env.SUPABASE_ANON_KEY,
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    process.env.VITE_SUPABASE_ANON_KEY
  );

  let hasValidUrl = isValidHttpUrl(url);
  let urlIssue: string | null = null;
  if (hasValidUrl) {
    try {
      const parsed = new URL(url);
      if (parsed.pathname && parsed.pathname !== '/') {
        hasValidUrl = false;
        urlIssue = `SUPABASE_URL must be your base project URL (e.g. ${parsed.origin}) without the "${parsed.pathname}" path.`;
      }
    } catch {
      hasValidUrl = false;
    }
  }

  const hasValidKey =
    !isPlaceholder(publishableKey) && publishableKey.length >= 20;

  return {
    url: url.replace(/\/+$/, ''),
    publishableKey,
    hasValidUrl,
    hasValidKey,
    urlIssue,
    keyFormat: classifyKeyFormat(publishableKey),
    isConfigured: hasValidUrl && hasValidKey,
  };
}

function createServerSupabase(accessToken?: string): SupabaseClient | null {
  const env = getSupabaseEnv();
  if (!env.isConfigured) return null;

  return createClient(env.url, env.publishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: accessToken
      ? {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      : undefined,
  });
}

function isMissingTableError(error: {
  code?: string;
  message?: string;
} | null): boolean {
  if (!error) return false;
  const code = error.code ?? '';
  const message = (error.message ?? '').toLowerCase();
  return (
    code === '42P01' ||
    code === 'PGRST205' ||
    message.includes('could not find the table') ||
    message.includes('relation "public.tasks" does not exist')
  );
}

function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  const token = header.slice('Bearer '.length).trim();
  return token.length > 0 ? token : null;
}

async function authenticateRequest(
  req: Request,
  res: Response
): Promise<{ client: SupabaseClient; user: User; token: string } | null> {
  const env = getSupabaseEnv();
  if (!env.isConfigured) {
    res.status(503).json({
      error: 'Supabase environment variables are not configured on the server.',
      code: 'SUPABASE_UNCONFIGURED',
    });
    return null;
  }

  const token = extractBearerToken(req);
  if (!token) {
    res.status(401).json({ error: 'Authentication required.' });
    return null;
  }

  const client = createServerSupabase(token);
  if (!client) {
    res.status(503).json({
      error: 'Supabase client is unavailable.',
      code: 'SUPABASE_UNCONFIGURED',
    });
    return null;
  }

  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) {
    res.status(401).json({ error: 'Session is invalid or expired. Please sign in again.' });
    return null;
  }

  return { client, user: data.user, token };
}

async function startServer() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '64kb' }));

  app.get('/api/health', async (_req: Request, res: Response) => {
    const env = getSupabaseEnv();

    if (!env.isConfigured) {
      const missing: string[] = [];
      if (!env.hasValidUrl) missing.push('SUPABASE_URL');
      if (!env.hasValidKey) missing.push('SUPABASE_PUBLISHABLE_KEY');

      res.json({
        state: 'unconfigured',
        message:
          env.urlIssue ??
          'Supabase environment variables are not configured on the server.',
        details: env.urlIssue
          ? undefined
          : `Missing or invalid: ${missing.join(', ')}`,
        env: {
          hasValidUrl: env.hasValidUrl,
          hasValidKey: env.hasValidKey,
        },
      });
      return;
    }

    const client = createServerSupabase();
    if (!client) {
      res.json({
        state: 'unconfigured',
        message: 'Supabase client could not be initialized.',
        env: {
          hasValidUrl: env.hasValidUrl,
          hasValidKey: env.hasValidKey,
        },
      });
      return;
    }

    try {
      const [authResponse, tableResult] = await Promise.all([
        fetch(`${env.url}/auth/v1/settings`, {
          method: 'GET',
          headers: {
            apikey: env.publishableKey,
            Accept: 'application/json',
          },
        }),
        client.from('tasks').select('id').limit(1),
      ]);

      if (!authResponse.ok) {
        const authBody = await authResponse.text().catch(() => '');
        const formatHint =
          env.keyFormat !== 'sb_publishable' && env.keyFormat !== 'jwt'
            ? ` Detected key format "${env.keyFormat}" instead of a Supabase Publishable key ("sb_publishable_...") or legacy anon JWT ("eyJ..."). Verify you pasted the full Publishable/anon key value (not a Key ID or access token, and without "KEY=" or quotes).`
            : '';

        res.json({
          state: 'error',
          message:
            'Supabase rejected the configured project URL or publishable key.',
          details: `Auth HTTP ${authResponse.status}, REST HTTP ${tableResult.status ?? 'unknown'}: ${authBody || authResponse.statusText}.${formatHint}`,
          env: {
            hasValidUrl: env.hasValidUrl,
            hasValidKey: env.hasValidKey,
          },
        });
        return;
      }

      const {
        error: tableError,
        status: tableStatus,
        statusText: tableStatusText,
      } = tableResult;

      if (tableError) {
        if (isMissingTableError(tableError)) {
          res.json({
            state: 'schema_missing',
            message:
              'Connected to Supabase, but the "public.tasks" table has not been created yet.',
            details:
              tableError.message ||
              `HTTP ${tableStatus} ${tableStatusText} (${tableError.code ?? 'missing_table'})`,
            env: {
              hasValidUrl: env.hasValidUrl,
              hasValidKey: env.hasValidKey,
            },
          });
          return;
        }

        const msgLower = (tableError.message ?? '').toLowerCase();
        const isPermissionDeniedOnly =
          tableError.code === '42501' ||
          msgLower.includes('permission denied for table') ||
          msgLower.includes('permission denied for relation');

        if (isPermissionDeniedOnly) {
          res.json({
            state: 'connected',
            message: 'Connected to Supabase PostgreSQL and Authentication.',
            env: {
              hasValidUrl: env.hasValidUrl,
              hasValidKey: env.hasValidKey,
            },
          });
          return;
        }

        const detailParts = [
          tableStatus ? `HTTP ${tableStatus} ${tableStatusText}`.trim() : '',
          tableError.code ? `code=${tableError.code}` : '',
          tableError.message || '',
          tableError.details || '',
          tableError.hint || '',
        ].filter(Boolean);

        res.json({
          state: 'error',
          message: 'Supabase database check failed.',
          details: detailParts.join(' · ') || 'Unknown PostgREST error',
          env: {
            hasValidUrl: env.hasValidUrl,
            hasValidKey: env.hasValidKey,
          },
        });
        return;
      }

      res.json({
        state: 'connected',
        message: 'Connected to Supabase PostgreSQL and Authentication.',
        env: {
          hasValidUrl: env.hasValidUrl,
          hasValidKey: env.hasValidKey,
        },
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unexpected network error';
      res.json({
        state: 'error',
        message: 'Unable to reach your Supabase project.',
        details: message,
        env: {
          hasValidUrl: env.hasValidUrl,
          hasValidKey: env.hasValidKey,
        },
      });
    }
  });

  app.post('/api/auth/signup', async (req: Request, res: Response) => {
    const client = createServerSupabase();
    if (!client) {
      res.status(503).json({
        error: 'Supabase is not configured on the server.',
        code: 'SUPABASE_UNCONFIGURED',
      });
      return;
    }

    const email =
      typeof req.body?.email === 'string' ? req.body.email.trim() : '';
    const password =
      typeof req.body?.password === 'string' ? req.body.password : '';

    if (!EMAIL_REGEX.test(email)) {
      res.status(400).json({ error: 'Please enter a valid email address.' });
      return;
    }

    if (password.length < 6 || password.length > 256) {
      res
        .status(400)
        .json({ error: 'Password must be between 6 and 256 characters.' });
      return;
    }

    const { data, error } = await client.auth.signUp({ email, password });
    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    if (!data.user) {
      res.status(400).json({ error: 'Account registration failed.' });
      return;
    }

    res.status(201).json({
      user: {
        id: data.user.id,
        email: data.user.email ?? email,
      },
      accessToken: data.session?.access_token ?? null,
      needsEmailConfirmation: !data.session,
    });
  });

  app.post('/api/auth/signin', async (req: Request, res: Response) => {
    const client = createServerSupabase();
    if (!client) {
      res.status(503).json({
        error: 'Supabase is not configured on the server.',
        code: 'SUPABASE_UNCONFIGURED',
      });
      return;
    }

    const email =
      typeof req.body?.email === 'string' ? req.body.email.trim() : '';
    const password =
      typeof req.body?.password === 'string' ? req.body.password : '';

    if (!EMAIL_REGEX.test(email) || password.length < 6) {
      res.status(400).json({ error: 'Invalid email or password.' });
      return;
    }

    const { data, error } = await client.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      res.status(401).json({ error: error.message });
      return;
    }

    if (!data.user || !data.session?.access_token) {
      res.status(401).json({ error: 'Sign in did not return a valid session.' });
      return;
    }

    res.json({
      user: {
        id: data.user.id,
        email: data.user.email ?? email,
      },
      accessToken: data.session.access_token,
    });
  });

  app.post('/api/auth/signout', async (req: Request, res: Response) => {
    const token = extractBearerToken(req);
    if (token) {
      const client = createServerSupabase(token);
      if (client) {
        await client.auth.signOut();
      }
    }
    res.json({ ok: true });
  });

  app.get('/api/tasks', async (req: Request, res: Response) => {
    const auth = await authenticateRequest(req, res);
    if (!auth) return;

    const useExtended = await detectExtendedTaskColumns(auth.client);
    const selectCols = useExtended ? TASK_EXTENDED_SELECT : TASK_BASE_SELECT;

    const { data, error } = await auth.client
      .from('tasks')
      .select(selectCols)
      .eq('user_id', auth.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      if (isMissingTableError(error)) {
        res.status(503).json({
          error: 'The "public.tasks" table does not exist in Supabase.',
          code: 'SCHEMA_MISSING',
        });
        return;
      }
      res.status(500).json({ error: error.message });
      return;
    }

    const rows = (data ?? []) as unknown as RawTaskRow[];
    res.json({ tasks: rows.map(decodeTaskRow) });
  });

  app.post('/api/tasks', async (req: Request, res: Response) => {
    const auth = await authenticateRequest(req, res);
    if (!auth) return;

    const title =
      typeof req.body?.title === 'string' ? req.body.title.trim() : '';
    const rawDescription =
      typeof req.body?.description === 'string'
        ? req.body.description.trim()
        : '';

    if (!title || title.length > 160) {
      res.status(400).json({
        error: 'Task title is required and must be 160 characters or fewer.',
      });
      return;
    }

    if (rawDescription.length > 1000) {
      res
        .status(400)
        .json({ error: 'Description must be 1000 characters or fewer.' });
      return;
    }

    if (
      req.body?.priority !== undefined &&
      (typeof req.body.priority !== 'string' ||
        !VALID_PRIORITIES.has(req.body.priority))
    ) {
      res.status(400).json({ error: 'Priority must be low, medium, or high.' });
      return;
    }
    const priority = normalizePriority(req.body?.priority);

    let dueDate: string | null = null;
    if (req.body?.due_date !== undefined && req.body.due_date !== null && req.body.due_date !== '') {
      const normalized = normalizeDueDate(req.body.due_date);
      if (!normalized) {
        res.status(400).json({ error: 'Due date must use YYYY-MM-DD format.' });
        return;
      }
      dueDate = normalized;
    }

    const useExtended = await detectExtendedTaskColumns(auth.client);
    const insertPayload: Record<string, unknown> = useExtended
      ? {
          user_id: auth.user.id,
          title,
          description: stripTaskMeta(rawDescription),
          is_completed: false,
          priority,
          due_date: dueDate,
        }
      : {
          user_id: auth.user.id,
          title,
          description: encodeDescriptionWithMeta(
            rawDescription,
            priority,
            dueDate
          ),
          is_completed: false,
        };

    const { data, error } = await auth.client
      .from('tasks')
      .insert(insertPayload)
      .select(useExtended ? TASK_EXTENDED_SELECT : TASK_BASE_SELECT)
      .single();

    if (error) {
      if (isMissingTableError(error)) {
        res.status(503).json({
          error: 'The "public.tasks" table does not exist in Supabase.',
          code: 'SCHEMA_MISSING',
        });
        return;
      }
      res.status(500).json({ error: error.message });
      return;
    }

    res.status(201).json({ task: decodeTaskRow(data as unknown as RawTaskRow) });
  });

  app.patch('/api/tasks/:id', async (req: Request, res: Response) => {
    const auth = await authenticateRequest(req, res);
    if (!auth) return;

    const taskId = req.params.id;
    if (!UUID_REGEX.test(taskId)) {
      res.status(400).json({ error: 'Invalid task ID.' });
      return;
    }

    const useExtended = await detectExtendedTaskColumns(auth.client);
    const patch: {
      title?: string;
      description?: string;
      is_completed?: boolean;
      priority?: TaskPriority;
      due_date?: string | null;
    } = {};

    if (req.body?.title !== undefined) {
      if (typeof req.body.title !== 'string') {
        res.status(400).json({ error: 'Invalid task title.' });
        return;
      }
      const trimmedTitle = req.body.title.trim();
      if (!trimmedTitle || trimmedTitle.length > 160) {
        res.status(400).json({
          error: 'Task title is required and must be 160 characters or fewer.',
        });
        return;
      }
      patch.title = trimmedTitle;
    }

    let nextCleanDescription: string | undefined;
    if (req.body?.description !== undefined) {
      if (typeof req.body.description !== 'string') {
        res.status(400).json({ error: 'Invalid task description.' });
        return;
      }
      const trimmedDesc = req.body.description.trim();
      if (trimmedDesc.length > 1000) {
        res
          .status(400)
          .json({ error: 'Description must be 1000 characters or fewer.' });
        return;
      }
      nextCleanDescription = stripTaskMeta(trimmedDesc);
    }

    if (req.body?.is_completed !== undefined) {
      if (typeof req.body.is_completed !== 'boolean') {
        res.status(400).json({ error: 'Invalid completion status.' });
        return;
      }
      patch.is_completed = req.body.is_completed;
    }

    let nextPriority: TaskPriority | undefined;
    if (req.body?.priority !== undefined) {
      if (
        typeof req.body.priority !== 'string' ||
        !VALID_PRIORITIES.has(req.body.priority)
      ) {
        res.status(400).json({ error: 'Priority must be low, medium, or high.' });
        return;
      }
      nextPriority = req.body.priority as TaskPriority;
    }

    let nextDueDate: string | null | undefined;
    if (req.body?.due_date !== undefined) {
      if (req.body.due_date === null || req.body.due_date === '') {
        nextDueDate = null;
      } else {
        const normalized = normalizeDueDate(req.body.due_date);
        if (!normalized) {
          res.status(400).json({ error: 'Due date must use YYYY-MM-DD format.' });
          return;
        }
        nextDueDate = normalized;
      }
    }

    if (useExtended) {
      if (nextCleanDescription !== undefined) {
        patch.description = nextCleanDescription;
      }
      if (nextPriority !== undefined) {
        patch.priority = nextPriority;
      }
      if (nextDueDate !== undefined) {
        patch.due_date = nextDueDate;
      }
    } else if (
      nextCleanDescription !== undefined ||
      nextPriority !== undefined ||
      nextDueDate !== undefined
    ) {
      const { data: existingRow, error: existingError } = await auth.client
        .from('tasks')
        .select(TASK_BASE_SELECT)
        .eq('id', taskId)
        .eq('user_id', auth.user.id)
        .maybeSingle();

      if (existingError) {
        if (isMissingTableError(existingError)) {
          res.status(503).json({
            error: 'The "public.tasks" table does not exist in Supabase.',
            code: 'SCHEMA_MISSING',
          });
          return;
        }
        res.status(500).json({ error: existingError.message });
        return;
      }

      if (!existingRow) {
        res.status(404).json({ error: 'Task not found.' });
        return;
      }

      const decodedExisting = decodeTaskRow(existingRow as unknown as RawTaskRow);
      patch.description = encodeDescriptionWithMeta(
        nextCleanDescription ?? decodedExisting.description,
        nextPriority ?? decodedExisting.priority,
        nextDueDate !== undefined ? nextDueDate : decodedExisting.due_date
      );
    }

    if (Object.keys(patch).length === 0) {
      res.status(400).json({ error: 'No valid update fields provided.' });
      return;
    }

    const { data, error } = await auth.client
      .from('tasks')
      .update(patch)
      .eq('id', taskId)
      .eq('user_id', auth.user.id)
      .select(useExtended ? TASK_EXTENDED_SELECT : TASK_BASE_SELECT)
      .maybeSingle();

    if (error) {
      if (isMissingTableError(error)) {
        res.status(503).json({
          error: 'The "public.tasks" table does not exist in Supabase.',
          code: 'SCHEMA_MISSING',
        });
        return;
      }
      res.status(500).json({ error: error.message });
      return;
    }

    if (!data) {
      res.status(404).json({ error: 'Task not found.' });
      return;
    }

    res.json({ task: decodeTaskRow(data as unknown as RawTaskRow) });
  });

  app.delete('/api/tasks/:id', async (req: Request, res: Response) => {
    const auth = await authenticateRequest(req, res);
    if (!auth) return;

    const taskId = req.params.id;
    if (!UUID_REGEX.test(taskId)) {
      res.status(400).json({ error: 'Invalid task ID.' });
      return;
    }

    const { data, error } = await auth.client
      .from('tasks')
      .delete()
      .eq('id', taskId)
      .eq('user_id', auth.user.id)
      .select('id');

    if (error) {
      if (isMissingTableError(error)) {
        res.status(503).json({
          error: 'The "public.tasks" table does not exist in Supabase.',
          code: 'SCHEMA_MISSING',
        });
        return;
      }
      res.status(500).json({ error: error.message });
      return;
    }

    if (!data || data.length === 0) {
      res.status(404).json({ error: 'Task not found.' });
      return;
    }

    res.json({ ok: true });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      const indexPath = path.join(distDir, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send('Build output not found. Run npm run build first.');
      }
    });
  }

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`ClearTask server listening on port ${port}`);
  });
}

void startServer();
