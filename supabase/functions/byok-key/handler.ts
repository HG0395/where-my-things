import {
  authenticate,
  cors,
  failure,
  HttpError,
  json,
  readJson,
} from "../_shared/http.ts";
import { encryptKey } from "../_shared/crypto.ts";

export async function handler(request: Request) {
  let headers = new Headers({
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  });
  try {
    headers = cors(request);
    if (request.method === "OPTIONS")
      return new Response(null, { status: 204, headers });
    const { admin, userId } = await authenticate(request);
    const body = await readJson(request, 8192);
    if (body.action === "save") {
      if (
        typeof body.key !== "string" ||
        !/^[A-Za-z0-9_-]{20,200}$/.test(body.key.trim())
      )
        throw new HttpError(400, "Gemini API 키 형식을 확인해 주세요.");
      const secret = Deno.env.get("BYOK_ENCRYPTION_KEY");
      if (!secret) throw new HttpError(503, "서버 암호화 설정이 필요해요.");
      const version = crypto.randomUUID();
      const encrypted = await encryptKey(
        body.key.trim(),
        userId,
        version,
        secret,
      );
      const { error } = await admin.rpc("byok_save_key", {
        p_user_id: userId,
        p_ciphertext: encrypted.ciphertext,
        p_iv: encrypted.iv,
        p_version: version,
      });
      if (error) throw new Error("Key save failed");
      return json({ saved: true }, headers);
    }
    if (body.action === "delete") {
      const { error } = await admin.rpc("byok_delete_key", {
        p_user_id: userId,
      });
      if (error) throw new Error("Key delete failed");
      return json({ deleted: true }, headers);
    }
    if (body.action === "status") {
      const day = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Seoul",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date());
      const [key, usage] = await Promise.all([
        admin
          .from("byok_keys")
          .select("updated_at")
          .eq("user_id", userId)
          .maybeSingle(),
        admin
          .from("byok_usage")
          .select("attempts")
          .eq("user_id", userId)
          .eq("day", day)
          .maybeSingle(),
      ]);
      if (key.error || usage.error) throw new Error("Status lookup failed");
      return json(
        {
          hasKey: !!key.data,
          updatedAt: key.data?.updated_at ?? null,
          attempts: usage.data?.attempts ?? 0,
          dailyLimit: 20,
        },
        headers,
      );
    }
    throw new HttpError(400, "지원하지 않는 키 관리 요청이에요.");
  } catch (cause) {
    return failure(cause, headers);
  }
}
