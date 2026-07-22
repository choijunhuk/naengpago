export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export function json(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: corsHeaders });
}

export function apiError(code: string, message: string, status: number, detail?: unknown): Response {
  return json({ error: { code, message, ...(detail === undefined ? {} : { detail }) } }, status);
}

