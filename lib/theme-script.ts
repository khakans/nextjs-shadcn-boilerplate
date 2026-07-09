export const themeInitializerScript = `
(() => {
  const themeStorageKey = "expensesman-theme";
  const accentStorageKey = "expensesman-accent";
  const languageStorageKey = "expensesman-language";
  const cookieMaxAgeSeconds = 60 * 60 * 24 * 365;
  const getCookie = (name) =>
    document.cookie
      .split("; ")
      .find((row) => row.startsWith(name + "="))
      ?.split("=")[1];
  const mode = localStorage.getItem(themeStorageKey) || "system";
  const accent = localStorage.getItem(accentStorageKey) || "blue";
  const language =
    localStorage.getItem(languageStorageKey) ||
    getCookie(languageStorageKey) ||
    "en";
  const shouldUseDark =
    mode === "dark" ||
    (mode !== "light" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  document.documentElement.classList.toggle("dark", shouldUseDark);
  document.documentElement.style.colorScheme = shouldUseDark ? "dark" : "light";
  document.documentElement.dataset.accent = accent;
  document.documentElement.lang = language;
  document.cookie =
    languageStorageKey +
    "=" +
    language +
    "; path=/; max-age=" +
    cookieMaxAgeSeconds +
    "; SameSite=Lax";
})();
`;
