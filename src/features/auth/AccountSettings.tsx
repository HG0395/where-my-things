import { useI18n } from "../../i18n/context.ts";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { supabase } from "../../lib/supabase.ts";
import { byokRequest, keyStatus } from "../../lib/byokApi.ts";
import type { KeyStatus } from "../../lib/byokApi.ts";
import { useAuth } from "./authContext.ts";

export function AccountSettings() {
  const { t } = useI18n();
  const { user } = useAuth();
  const userId = user?.id;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [key, setKey] = useState("");
  const [status, setStatus] = useState<KeyStatus | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [signup, setSignup] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [consent, setConsent] = useState(false);
  useEffect(() => {
    if (!userId) return;
    let active = true;
    keyStatus()
      .then((value) => {
        if (active) setStatus(value);
      })
      .catch((cause) => {
        if (active) setError((cause as Error).message);
      });
    return () => {
      active = false;
    };
  }, [userId]);
  async function authenticate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const emailInput = event.currentTarget.elements.namedItem(
        "auth-email",
      ) as HTMLInputElement;
      if (!emailInput.validity.valid)
        throw new Error("올바른 이메일 주소를 입력해 주세요.");
      if (password.length < 8)
        throw new Error("비밀번호는 8자 이상 입력해 주세요.");
      const result = signup
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password });
      setPassword("");
      if (result.error)
        throw new Error(
          signup
            ? "가입하지 못했어요. 이메일과 비밀번호 조건을 확인해 주세요."
            : "로그인하지 못했어요. 이메일·비밀번호·이메일 인증 여부를 확인해 주세요.",
        );
      if (signup && !result.data.session)
        setMessage("가입 확인 메일을 보냈어요. 메일 인증 후 로그인해 주세요.");
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function saveKey(event: FormEvent) {
    event.preventDefault();
    if (busy || !consent) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await byokRequest("byok-key", { action: "save", key });
      setKey("");
      setConsent(false);
      setStatus(await keyStatus());
      setMessage(
        "키를 암호화해 저장했어요. 실제 유효성은 처음 분석할 때 확인됩니다.",
      );
    } catch (cause) {
      setKey("");
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function deleteKey() {
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await byokRequest("byok-key", { action: "delete" });
      setStatus(await keyStatus());
      setDeleteConfirm(false);
      setMessage(
        "본인의 키와 분석 캐시를 삭제했어요. 오늘의 호출 횟수는 유지돼요.",
      );
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (!supabase)
    return (
      <div className="form-stack">
        <div className="current-location">
          <strong>{t("Supabase 연결 전이에요")}</strong>
          <p className="help">
            {t(
              "프로젝트를 만든 뒤 공개 URL과 publishable 키를 로컬 환경설정에 입력하면 로그인과 본인 API 키 등록을 사용할 수 있어요.",
            )}
          </p>
        </div>
        <p className="help">
          {t(
            "Gemini 키는 프로젝트 코드에 넣지 않습니다. 서버 설정 방법은 저장소의 docs/사용자_API_설정.md에 있어요.",
          )}
        </p>
        <p>{t("물품 관리는 계속 모의 데이터로 이용할 수 있어요.")}</p>
      </div>
    );
  return (
    <div className="form-stack">
      {!user ? (
        <form
          className="form-stack"
          noValidate
          onSubmit={(event) => void authenticate(event)}
        >
          <p className="help">
            {t("본인 계정에 로그인한 뒤 자신의 Gemini 키를 등록해 주세요.")}
          </p>
          <label htmlFor="auth-email">{t("이메일")}</label>
          <input
            id="auth-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <label htmlFor="auth-password">{t("비밀번호")}</label>
          <input
            id="auth-password"
            type="password"
            autoComplete={signup ? "new-password" : "current-password"}
            required
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <div className="button-row">
            <button type="submit" className="button primary" disabled={busy}>
              {busy ? t("처리 중…") : signup ? t("회원가입") : t("로그인")}
            </button>
            <button
              type="button"
              className="text-button"
              disabled={busy}
              onClick={() => {
                setSignup(!signup);
                setError("");
                setMessage("");
              }}
            >
              {signup ? t("로그인으로 돌아가기") : t("새 계정 만들기")}
            </button>
          </div>
        </form>
      ) : (
        <>
          <div className="section-row">
            <div>
              <strong>{user.email}</strong>
              <p className="help">
                {t("개인 API 키는 다른 이용자에게 공유되지 않아요.")}
              </p>
            </div>
            <button
              type="button"
              className="button secondary small"
              disabled={busy}
              onClick={async () => {
                if (!supabase) return;
                setBusy(true);
                const result = await supabase.auth.signOut({ scope: "local" });
                if (result.error) {
                  setError("로그아웃하지 못했어요. 다시 시도해 주세요.");
                  setBusy(false);
                }
              }}
            >
              {t("로그아웃")}
            </button>
          </div>
          <div className="current-location">
            <strong>
              {status
                ? status.hasKey
                  ? t("본인 Gemini 키가 등록되어 있어요")
                  : t("아직 등록한 키가 없어요")
                : t("키 상태를 확인하고 있어요")}
            </strong>
            <p className="help">
              {t("오늘의 분석 요청")} {status?.attempts ?? "—"} /{" "}
              {status?.dailyLimit ?? 20}
              {t("회 · 한국 시간 자정 초기화 · 실패한 요청도 횟수에 포함")}
            </p>
          </div>
          <form
            className="form-stack"
            noValidate
            onSubmit={(event) => void saveKey(event)}
          >
            <label htmlFor="gemini-key">
              {status?.hasKey
                ? t("새 Gemini API 키로 교체")
                : t("본인의 Gemini API 키")}
            </label>
            <input
              id="gemini-key"
              type="password"
              autoComplete="off"
              spellCheck={false}
              required
              minLength={20}
              maxLength={200}
              value={key}
              onChange={(event) => setKey(event.target.value)}
              placeholder={t("이 계정에서만 사용할 키")}
            />
            <p className="help">
              {t(
                "HTTPS로 서버에 전송한 뒤 암호화해 보관합니다. 저장된 원문은 다시 표시하지 않아요. 운영 서버는 분석을 위해 키를 복호화할 수 있습니다.",
              )}
            </p>
            <label className="consent-label">
              <input
                type="checkbox"
                checked={consent}
                onChange={(event) => setConsent(event.target.checked)}
              />
              {t(
                "본인 소유의 키이며, 본인 Gemini 프로젝트 한도와 요금 정책으로 요청하는 데 동의합니다.",
              )}
            </label>
            <button
              type="submit"
              className="button primary"
              disabled={busy || !consent}
            >
              {busy ? t("처리 중…") : t("키 암호화 저장")}
            </button>
          </form>
          {status?.hasKey &&
            (deleteConfirm ? (
              <div className="delete-inline">
                <p>{t("본인의 API 키와 분석 캐시를 삭제할까요?")}</p>
                <div className="button-row">
                  <button
                    type="button"
                    className="button secondary small"
                    disabled={busy}
                    onClick={() => setDeleteConfirm(false)}
                  >
                    {t("취소")}
                  </button>
                  <button
                    type="button"
                    className="button danger small"
                    disabled={busy}
                    onClick={() => void deleteKey()}
                  >
                    {t("키 삭제 확인")}
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className="text-button danger-text"
                disabled={busy}
                onClick={() => setDeleteConfirm(true)}
              >
                {t("등록한 키 삭제")}
              </button>
            ))}
        </>
      )}
      {error && (
        <p role="alert" className="error">
          {t(error)}
        </p>
      )}
      {message && (
        <p role="status" className="help">
          {t(message)}
        </p>
      )}
      <p className="help">
        {t(
          "로그인·키 저장과 별개로 물품·위치·원본 사진은 아직 메모리 데모입니다. 새로고침하면 초기화되며 기기 간 동기화되지 않아요.",
        )}
      </p>
    </div>
  );
}
