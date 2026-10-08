import { createContext, useContext } from "react";
import type { Language, Values } from "./translate.ts";
interface I18nContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (message: string, values?: Values) => string;
  dateLocale: string;
}
export const I18nContext = createContext<I18nContextValue>({
  language: "ko",
  setLanguage: () => {},
  t: (message) => message,
  dateLocale: "ko-KR",
});
export const useI18n = () => useContext(I18nContext);
