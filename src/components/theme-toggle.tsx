"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "light" | "dark";
const STORAGE_KEY = "nyeri-color-theme";

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const savedTheme = localStorage.getItem(STORAGE_KEY);
    const initialTheme: Theme = savedTheme === "dark" || savedTheme === "light"
      ? savedTheme
      : window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    setTheme(initialTheme);
    applyTheme(initialTheme);
  }, []);

  function toggleTheme() {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    localStorage.setItem(STORAGE_KEY, nextTheme);
    applyTheme(nextTheme);
  }

  const Icon = theme === "light" ? Moon : Sun;
  const label = theme === "light" ? "Switch to soft dark mode" : "Switch to light mode";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="grid size-10 shrink-0 place-items-center rounded-lg border border-slate-300 bg-white text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 dark-theme-control"
      aria-label={label}
      title={label}
    >
      <Icon className="size-[18px]" aria-hidden="true" />
    </button>
  );
}
