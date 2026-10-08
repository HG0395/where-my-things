import {
  authenticate,
  cors,
  failure,
  HttpError,
  json,
  readJson,
} from "../_shared/http.ts";
import { decryptKey, fingerprint } from "../_shared/crypto.ts";
import {
  geminiBody,
  MODEL,
  parseRecognition,
  validateJpeg,
} from "../_shared/recognition.ts";

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
    const body = await readJson(request);
    let image;
    try {
      image = validateJpeg(body.image);
    } catch (cause) {
      throw new HttpError(400, (cause as Error).message);
    }
    const { data: key, error } = await admin
      .from("byok_keys")
      .select("ciphertext,iv,version")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error("Key lookup failed");
    if (!key)
      throw new HttpError(409, "AI 설정에서 본인의 키를 등록해 주세요.");
    const secret = Deno.env.get("BYOK_ENCRYPTION_KEY");
    if (!secret) throw new HttpError(503, "서버 암호화 설정이 필요해요.");
    const rawKey = await decryptKey(
      key.ciphertext,
      key.iv,
      userId,
      key.version,
      secret,
    );
    const hash = await fingerprint(image.bytes, MODEL, key.version);
    const { data: reservation, error: reserveError } = await admin.rpc(
      "byok_reserve",
      { p_user_id: userId, p_fingerprint: hash, p_key_version: key.version },
    );
    if (reserveError) throw new Error("Reservation failed");
    if (reservation?.status === "cached")
      return json(
        { ...reservation.result, cached: true, chargedTokens: 0 },
        headers,
      );
    if (reservation?.status === "daily_limit")
      throw new HttpError(
        429,
        "오늘의 분석 한도 20회에 도달했어요. 한국 시간 자정에 초기화돼요.",
      );
    if (reservation?.status === "cooldown" || reservation?.status === "busy") {
      headers.set("Retry-After", String(reservation.retryAfter ?? 20));
      throw new HttpError(
        429,
        "분석 중이거나 요청 간격이 짧아요. 잠시 후 직접 다시 요청해 주세요.",
      );
    }
    if (reservation?.status !== "reserved")
      throw new HttpError(409, "API 키가 변경됐어요. AI 설정을 확인해 주세요.");
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": rawKey,
          },
          body: JSON.stringify(geminiBody(image.base64)),
          signal: AbortSignal.timeout(25_000),
        },
      );
      if (!response.ok) {
        await response.body?.cancel();
        if (response.status === 429)
          throw new HttpError(
            429,
            "본인 Gemini 프로젝트의 사용 한도를 확인해 주세요. 자동 재시도는 하지 않아요.",
          );
        if (
          response.status === 400 ||
          response.status === 401 ||
          response.status === 403
        )
          throw new HttpError(
            422,
            "Gemini 키의 유효성·API 사용 권한을 확인해 주세요.",
          );
        throw new HttpError(
          502,
          "Gemini에서 분석을 완료하지 못했어요. 수동 등록은 계속 사용할 수 있어요.",
        );
      }
      const result = parseRecognition(await response.json());
      const { data: saved, error: finishError } = await admin.rpc(
        "byok_finish",
        { p_user_id: userId, p_job_id: reservation.jobId, p_result: result },
      );
      if (finishError || !saved)
        throw new HttpError(
          409,
          "요청 중 키가 변경됐거나 처리 시간이 만료됐어요. 설정을 확인해 주세요.",
        );
      return json(
        {
          ...result,
          cached: false,
          chargedTokens: result.inputTokens + result.outputTokens,
        },
        headers,
      );
    } catch (cause) {
      await admin.rpc("byok_finish", {
        p_user_id: userId,
        p_job_id: reservation.jobId,
        p_result: null,
      });
      if (cause instanceof HttpError) throw cause;
      throw new HttpError(
        502,
        "분석 시간이 초과됐거나 결과를 읽지 못했어요. 자동 재시도는 하지 않아요.",
      );
    }
  } catch (cause) {
    return failure(cause, headers);
  }
}
