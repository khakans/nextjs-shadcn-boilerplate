"use client";

import * as React from "react";

export type ThemeMode = "light" | "dark" | "system";
export type AccentColor = "blue" | "red" | "orange" | "purple" | "neutral";
export type LanguagePreference = "en" | "id";

const THEME_STORAGE_KEY = "expensesman-theme";
const ACCENT_STORAGE_KEY = "expensesman-accent";
const LANGUAGE_STORAGE_KEY = "expensesman-language";
const THEME_CHANGE_EVENT = "expensesman-theme-change";
const ACCENT_CHANGE_EVENT = "expensesman-accent-change";
const LANGUAGE_CHANGE_EVENT = "expensesman-language-change";
const DEFAULT_ACCENT_COLOR: AccentColor = "blue";
const DEFAULT_LANGUAGE_PREFERENCE: LanguagePreference = "en";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

const ThemePreferenceContext = React.createContext<{
  initialLanguage: LanguagePreference;
}>({
  initialLanguage: DEFAULT_LANGUAGE_PREFERENCE,
});

export function ThemePreferenceProvider({
  children,
  initialLanguage,
}: {
  children: React.ReactNode;
  initialLanguage: LanguagePreference;
}) {
  return React.createElement(
    ThemePreferenceContext.Provider,
    { value: { initialLanguage } },
    children,
  );
}

export function useThemeMode() {
  const mode = React.useSyncExternalStore(
    subscribeToTheme,
    getThemeSnapshot,
    getServerThemeSnapshot,
  );

  const setMode = React.useCallback((nextMode: ThemeMode) => {
    setThemeMode(nextMode);
  }, []);

  return {
    mode,
    setMode,
  };
}

export function useAccentColor() {
  const accent = React.useSyncExternalStore(
    subscribeToAccent,
    getAccentSnapshot,
    getServerAccentSnapshot,
  );

  const setAccent = React.useCallback((nextAccent: AccentColor) => {
    setAccentColor(nextAccent);
  }, []);

  return {
    accent,
    setAccent,
  };
}

export function useLanguagePreference() {
  const { initialLanguage } = React.useContext(ThemePreferenceContext);
  const language = React.useSyncExternalStore(
    subscribeToLanguage,
    getLanguageSnapshot,
    () => initialLanguage,
  );

  const setLanguage = React.useCallback((nextLanguage: LanguagePreference) => {
    setLanguagePreference(nextLanguage);
  }, []);

  return {
    language,
    setLanguage,
  };
}

export function setThemeMode(mode: ThemeMode) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(THEME_STORAGE_KEY, mode);
  applyThemeMode(mode);
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}

export function setAccentColor(accent: AccentColor) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(ACCENT_STORAGE_KEY, accent);
  applyAccentColor(accent);
  window.dispatchEvent(new Event(ACCENT_CHANGE_EVENT));
}

export function setLanguagePreference(language: LanguagePreference) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  setPreferenceCookie(LANGUAGE_STORAGE_KEY, language);
  applyLanguagePreference(language);
  window.dispatchEvent(new Event(LANGUAGE_CHANGE_EVENT));
}

function subscribeToTheme(onStoreChange: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const notify = () => {
    applyThemeMode(getStoredThemeMode());
    onStoreChange();
  };

  window.addEventListener(THEME_CHANGE_EVENT, notify);
  window.addEventListener("storage", notify);
  media.addEventListener("change", notify);

  return () => {
    window.removeEventListener(THEME_CHANGE_EVENT, notify);
    window.removeEventListener("storage", notify);
    media.removeEventListener("change", notify);
  };
}

function subscribeToAccent(onStoreChange: () => void) {
  const notify = () => {
    applyAccentColor(getStoredAccentColor());
    onStoreChange();
  };

  window.addEventListener(ACCENT_CHANGE_EVENT, notify);
  window.addEventListener("storage", notify);

  return () => {
    window.removeEventListener(ACCENT_CHANGE_EVENT, notify);
    window.removeEventListener("storage", notify);
  };
}

function subscribeToLanguage(onStoreChange: () => void) {
  const notify = () => {
    applyLanguagePreference(getStoredLanguagePreference());
    onStoreChange();
  };

  window.addEventListener(LANGUAGE_CHANGE_EVENT, notify);
  window.addEventListener("storage", notify);

  return () => {
    window.removeEventListener(LANGUAGE_CHANGE_EVENT, notify);
    window.removeEventListener("storage", notify);
  };
}

function getThemeSnapshot() {
  return getStoredThemeMode();
}

function getServerThemeSnapshot(): ThemeMode {
  return "system";
}

function getAccentSnapshot() {
  return getStoredAccentColor();
}

function getServerAccentSnapshot(): AccentColor {
  return DEFAULT_ACCENT_COLOR;
}

function getLanguageSnapshot() {
  return getStoredLanguagePreference();
}

function getStoredThemeMode(): ThemeMode {
  const storedMode = window.localStorage.getItem(THEME_STORAGE_KEY);

  if (
    storedMode === "light" ||
    storedMode === "dark" ||
    storedMode === "system"
  ) {
    return storedMode;
  }

  return "system";
}

function getStoredAccentColor(): AccentColor {
  const storedAccent = window.localStorage.getItem(ACCENT_STORAGE_KEY);

  if (
    storedAccent === "blue" ||
    storedAccent === "red" ||
    storedAccent === "orange" ||
    storedAccent === "purple" ||
    storedAccent === "neutral"
  ) {
    return storedAccent;
  }

  return DEFAULT_ACCENT_COLOR;
}

function getStoredLanguagePreference(): LanguagePreference {
  const storedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);

  if (storedLanguage === "en" || storedLanguage === "id") {
    return storedLanguage;
  }

  const documentLanguage = document.documentElement.lang;

  if (documentLanguage === "en" || documentLanguage === "id") {
    return documentLanguage;
  }

  return DEFAULT_LANGUAGE_PREFERENCE;
}

function applyThemeMode(mode: ThemeMode) {
  const shouldUseDark =
    mode === "dark" ||
    (mode === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  document.documentElement.classList.toggle("dark", shouldUseDark);
  document.documentElement.style.colorScheme = shouldUseDark ? "dark" : "light";
}

function applyAccentColor(accent: AccentColor) {
  document.documentElement.dataset.accent = accent;
}

function applyLanguagePreference(language: LanguagePreference) {
  document.documentElement.lang = language;
}

function setPreferenceCookie(name: string, value: string) {
  document.cookie = `${name}=${value}; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
}
