import { english } from "./catalog.ts";
export type Language = "ko" | "en";
export type Values = Record<string, string | number>;
export const LANGUAGE_STORAGE_KEY = "where-my-things.language";
export function normalizeLanguage(value: unknown): Language {
  return value === "en" ? "en" : "ko";
}
export function translate(
  message: string,
  language: Language,
  values: Values = {},
): string {
  const template = language === "en" ? (english[message] ?? message) : message;
  return template.replace(/\{(\w+)\}/g, (token, key: string) =>
    Object.hasOwn(values, key) ? String(values[key]) : token,
  );
}
