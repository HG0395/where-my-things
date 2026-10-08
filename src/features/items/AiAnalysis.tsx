import { useI18n } from "../../i18n/context.ts";
import { useRef, useState } from "react";
import { useAuth } from "../auth/authContext.ts";
import { byokRequest, prepareAiImage } from "../../lib/byokApi.ts";
import type { AiResult } from "../../lib/byokApi.ts";
import { supabase } from "../../lib/supabase.ts";

export function AiAnalysis({
  photo,
  onApply,
  onBusy,
}: {
  photo: string | null;
  onApply: (name: string, tags: string[]) => void;
  onBusy: (busy: boolean) => void;
}) {
  const { t, language } = useI18n();
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const [result, setResult] = useState<AiResult | null>(null);
  const [error, setError] = useState("");
  const [consent, setConsent] = useState(false);
  async function analyze() {
    if (!photo || !user || !consent || locked.current) return;
    locked.current = true;
    setBusy(true);
    onBusy(true);
    setError("");
    setResult(null);
    try {
      const image = await prepareAiImage(photo);
      setResult(
        await byokRequest<AiResult>("recognize-item", { image, language }),
      );
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      locked.current = false;
      setBusy(false);
      onBusy(false);
    }
  }
  return (
    <section className="ai-panel" aria-label={t("내 API로 물품 분석")}>
      <div className="section-row">
        <strong>{t("내 Gemini API로 분석")}</strong>
        <span className="chip">{t("사용자별 키")}</span>
      </div>
      <p className="help">
        {!supabase
          ? t("Supabase 연결 후 사용할 수 있어요.")
          : !user
            ? t("계정·AI 설정에서 로그인하고 본인 키를 등록해 주세요.")
            : t(
                "작게 변환한 사진 한 장만 전송합니다. 이름·태그만 제안하며 수동으로 고칠 수 있어요.",
              )}
      </p>
      <label className="consent-label">
        <input
          type="checkbox"
          checked={consent}
          disabled={busy || !photo || !user}
          onChange={(event) => setConsent(event.target.checked)}
        />
        {t("이 사진의 분석용 사본을 Google Gemini로 보내는 데 동의합니다.")}
      </label>
      <button
        type="button"
        className="button secondary small"
        disabled={!photo || !user || !consent || busy}
        onClick={() => void analyze()}
      >
        {busy ? t("분석 중…") : t("내 키로 사진 분석")}
      </button>
      {error && (
        <p className="error" role="alert">
          {t(error)}
        </p>
      )}
      {result && (
        <div className="candidate-list">
          <button
            type="button"
            className="chip candidate"
            onClick={() => onApply(result.name, result.tags)}
          >
            {t("제안 적용:")} {result.name} · {result.tags.join(", ")}
          </button>
          <p className="help">
            {result.cached
              ? t(
                  "같은 사진의 캐시 결과예요. 이번 API 호출과 토큰 사용은 0입니다.",
                )
              : t(
                  "이번 응답: 입력 {input} · 출력 {output} 토큰 (제공자 보고값)",
                  { input: result.inputTokens, output: result.outputTokens },
                )}{" "}
            {t("· 적용 후 입력값을 확인하고 저장해 주세요.")}
          </p>
        </div>
      )}
      <p className="help">
        {t(
          "하루 최대 20회 · 새 분석은 20초 간격 · 자동 재시도 없음. 결제는 활성화하지 않아요.",
        )}
      </p>
    </section>
  );
}
