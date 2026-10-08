import { supabase } from "./supabase.ts";
export interface KeyStatus {
  hasKey: boolean;
  updatedAt: string | null;
  attempts: number;
  dailyLimit: number;
}
export interface AiResult {
  name: string;
  tags: string[];
  inputTokens: number;
  outputTokens: number;
  chargedTokens: number;
  cached: boolean;
}
export async function byokRequest<T>(
  functionName: "byok-key" | "recognize-item",
  body: object,
): Promise<T> {
  if (!supabase)
    throw new Error(
      "Supabase 프로젝트 연결이 필요해요. 설정 안내를 확인해 주세요.",
    );
  const { data: sessionData, error: sessionError } =
    await supabase.auth.getSession();
  if (sessionError || !sessionData.session)
    throw new Error("먼저 로그인해 주세요.");
  const { data, error } = await supabase.functions.invoke(functionName, {
    body,
  });
  if (error) {
    // Expose only our own bounded, sanitized function response, never raw SDK/provider errors.
    const context = (error as { context?: unknown }).context;
    let message: string | undefined;
    if (context instanceof Response) {
      try {
        const payload = await context.json();
        if (typeof payload.error === "string" && payload.error.length < 300)
          message = payload.error;
      } catch {
        // Malformed responses use the generic message below.
      }
    }
    if (message) throw new Error(message);
    throw new Error(
      "서버에 연결하지 못했어요. 로그인과 함수 배포 설정을 확인해 주세요.",
    );
  }
  return data as T;
}
export const keyStatus = () =>
  byokRequest<KeyStatus>("byok-key", { action: "status" });

// Re-encoding removes metadata from the AI copy and bounds image dimensions/token input.
export async function prepareAiImage(photo: string): Promise<string> {
  const image = new Image();
  image.src = photo;
  await image.decode();
  const ratio = Math.min(
    1,
    1024 / Math.max(image.naturalWidth, image.naturalHeight),
  );
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("이 브라우저에서는 사진을 준비할 수 없어요.");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const base64 = canvas.toDataURL("image/jpeg", 0.72).split(",")[1];
  if (!base64 || base64.length > Math.ceil((512 * 1024) / 3) * 4)
    throw new Error(
      "사진이 너무 복잡하거나 커요. 크기를 줄인 뒤 다시 선택해 주세요.",
    );
  canvas.width = 1;
  canvas.height = 1;
  return base64;
}
