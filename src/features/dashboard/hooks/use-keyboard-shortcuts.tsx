"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Global keyboard shortcuts for the application.
 * 
 * Shortcuts:
 * - Ctrl+K / Cmd+K: Focus search
 * - Ctrl+N / Cmd+N: New project
 * - Ctrl+, / Cmd+,: Open settings
 * - Escape: Close dialogs/modals
 */

interface KeyboardShortcutsProps {
  onNewProject?: () => void;
  onOpenSettings?: () => void;
  onFocusSearch?: () => void;
}

export function useKeyboardShortcuts({
  onNewProject,
  onOpenSettings,
  onFocusSearch,
}: KeyboardShortcutsProps = {}) {
  const router = useRouter();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const isModifier = e.metaKey || e.ctrlKey;
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      // Don't trigger shortcuts when typing in inputs (except Escape)
      if (isInput && e.key !== "Escape") return;

      // Ctrl/Cmd + K: Focus search
      if (isModifier && e.key === "k") {
        e.preventDefault();
        if (onFocusSearch) {
          onFocusSearch();
        } else {
          const searchInput = document.getElementById("search-projects") as HTMLInputElement;
          if (searchInput) {
            searchInput.focus();
            searchInput.select();
          }
        }
        return;
      }

      // Ctrl/Cmd + N: New project
      if (isModifier && e.key === "n") {
        e.preventDefault();
        if (onNewProject) {
          onNewProject();
        } else {
          const newBtn = document.getElementById("btn-new-project");
          newBtn?.click();
        }
        return;
      }

      // Ctrl/Cmd + ,: Open settings
      if (isModifier && e.key === ",") {
        e.preventDefault();
        onOpenSettings?.();
        return;
      }

      // Ctrl/Cmd + C on PRD view: Copy PRD
      if (isModifier && e.key === "c" && !window.getSelection()?.toString()) {
        const copyBtn = document.getElementById("btn-copy-prd");
        if (copyBtn) {
          // Only trigger if we're on a project page with PRD
          // Don't prevent default — allow normal copy if text is selected
        }
        return;
      }

      // Navigation shortcuts (no modifier needed)
      if (!isModifier && !isInput) {
        // H: Go home/dashboard
        if (e.key === "h") {
          router.push("/");
          return;
        }

        // ?: Show keyboard shortcuts help (future)
        if (e.key === "?") {
          // Could show a shortcuts dialog
          return;
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router, onNewProject, onOpenSettings, onFocusSearch]);
}

/**
 * Component that renders a keyboard shortcut hint badge.
 */
export function ShortcutHint({
  keys,
  className = "",
}: {
  keys: string;
  className?: string;
}) {
  const isMac =
    typeof navigator !== "undefined" &&
    navigator.platform.toLowerCase().includes("mac");

  const display = keys
    .replace("Ctrl", isMac ? "⌘" : "Ctrl")
    .replace("Alt", isMac ? "⌥" : "Alt")
    .replace("Shift", isMac ? "⇧" : "Shift");

  return (
    <kbd
      className={`hidden sm:inline-flex items-center gap-0.5 rounded border border-border/60 bg-muted/50 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground ${className}`}
    >
      {display}
    </kbd>
  );
}
