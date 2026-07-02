export const themeInitializerScript = `
(() => {
  const themeStorageKey = "expensesman-theme";
  const accentStorageKey = "expensesman-accent";
  const languageStorageKey = "expensesman-language";
  const mode = localStorage.getItem(themeStorageKey) || "system";
  const accent = localStorage.getItem(accentStorageKey) || "neutral";
  const language = localStorage.getItem(languageStorageKey) || "en";
  const shouldUseDark =
    mode === "dark" ||
    (mode !== "light" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  document.documentElement.classList.toggle("dark", shouldUseDark);
  document.documentElement.style.colorScheme = shouldUseDark ? "dark" : "light";
  document.documentElement.dataset.accent = accent;
  document.documentElement.lang = language;
})();
`;
