import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { I18nContext } from "./context.ts";
import {
  LANGUAGE_STORAGE_KEY,
  normalizeLanguage,
  translate,
} from "./translate.ts";
import type { Values } from "./translate.ts";
export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState(() => {
    try {
      return normalizeLanguage(localStorage.getItem(LANGUAGE_STORAGE_KEY));
    } catch {
      return "ko" as const;
    }
  });
  const t = useCallback(
    (message: string, values?: Values) => translate(message, language, values),
    [language],
  );
  useEffect(() => {
    document.documentElement.lang = language;
    document.title =
      language === "en" ? "Where Is It? — My inventory" : "어디뒀지?";
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    } catch {
      /* Private mode may disallow storage. */
    }
  }, [language]);
  return (
    <I18nContext.Provider
      value={{
        language,
        setLanguage,
        t,
        dateLocale: language === "en" ? "en-US" : "ko-KR",
      }}
    >
      {children}
    </I18nContext.Provider>
  );
}
