import { createClient } from "npm:@supabase/supabase-js@2.117.3";

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
export function cors(request: Request): Headers {
  const origin = request.headers.get("Origin");
  const allowed = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (!origin || !allowed.includes(origin) || allowed.includes("*"))
    throw new HttpError(403, "허용되지 않은 앱 주소예요.");
  return new Headers({
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers":
      "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
    "Cache-Control": "no-store",
    "Content-Type": "application/json",
    "X-Content-Type-Options": "nosniff",
  });
}
export function json(data: unknown, headers: Headers, status = 200) {
  return new Response(JSON.stringify(data), { status, headers });
}
export async function readJson(
  request: Request,
  limit = 750_000,
): Promise<Record<string, unknown>> {
  if (request.method !== "POST")
    throw new HttpError(405, "지원하지 않는 요청이에요.");
  if (
    !request.headers
      .get("Content-Type")
      ?.toLowerCase()
      .startsWith("application/json")
  )
    throw new HttpError(415, "JSON 요청이 필요해요.");
  if (Number(request.headers.get("Content-Length") ?? 0) > limit)
    throw new HttpError(413, "요청이 너무 커요.");
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "요청 내용이 없어요.");
  let size = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > limit) {
      await reader.cancel();
      throw new HttpError(413, "요청이 너무 커요.");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  try {
    const result = JSON.parse(new TextDecoder().decode(bytes));
    if (!result || typeof result !== "object" || Array.isArray(result))
      throw new Error();
    return result;
  } catch {
    throw new HttpError(400, "요청 형식이 올바르지 않아요.");
  }
}
export async function authenticate(request: Request) {
  const header = request.headers.get("Authorization") ?? "";
  if (!header.startsWith("Bearer ") || header.length > 16384)
    throw new HttpError(401, "먼저 로그인해 주세요.");
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new HttpError(503, "서버 연결 설정이 필요해요.");
  const admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await admin.auth.getUser(header.slice(7));
  if (error || !data.user)
    throw new HttpError(401, "로그인이 만료됐어요. 다시 로그인해 주세요.");
  return { admin, userId: data.user.id };
}
export function failure(cause: unknown, headers: Headers) {
  // Never forward raw provider/database messages, credentials, or request bodies.
  return cause instanceof HttpError
    ? json({ error: cause.message }, headers, cause.status)
    : json(
        { error: "요청을 처리하지 못했어요. 서버 설정을 확인해 주세요." },
        headers,
        500,
      );
}
