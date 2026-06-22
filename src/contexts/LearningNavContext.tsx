import React, { createContext, useContext, useMemo, useState } from "react";

/**
 * Shared course-tree state between LearningHub (the page that fetches
 * categories/lessons/progress) and AppLayout (the global sidebar that
 * renders the tree when on the Learning Hub route).
 *
 * LearningHub publishes via `setTree`; AppLayout reads `tree` and calls
 * `tree.onSelect` when the user clicks a lesson.
 *
 * Why a context (not props): AppLayout lives above Index/LearningHub in
 * the tree, so we can't lift state without major refactor. Context is
 * scoped to the authenticated app shell only.
 */

export interface LearningTreeCategory {
  id: string;
  name: string;
  emoji?: string;
  is_locked?: boolean;
}

export interface LearningTreeLesson {
  id: string;
  title: string;
  category: string;
  order_index: number;
  is_premium?: boolean;
  is_pro?: boolean;
}

export interface LearningTreeProgress {
  completed?: boolean;
  progress_pct?: number;
}

export interface LearningTree {
  categories: LearningTreeCategory[];
  lessons: LearningTreeLesson[];
  progress: Record<string, LearningTreeProgress>;
  selectedLessonId: string | null;
  onSelect: (lesson: LearningTreeLesson) => void;
  search: string;
  setSearch: (s: string) => void;
}

interface LearningNavContextValue {
  tree: LearningTree | null;
  setTree: (t: LearningTree | null) => void;
}

const LearningNavContext = createContext<LearningNavContextValue | null>(null);

export function LearningNavProvider({ children }: { children: React.ReactNode }) {
  const [tree, setTree] = useState<LearningTree | null>(null);
  const value = useMemo(() => ({ tree, setTree }), [tree]);
  return <LearningNavContext.Provider value={value}>{children}</LearningNavContext.Provider>;
}

export function useLearningNav(): LearningNavContextValue {
  const ctx = useContext(LearningNavContext);
  if (!ctx) {
    // Safe no-op fallback so the hook can be called outside the provider
    // (e.g. marketing pages) without throwing.
    return { tree: null, setTree: () => {} };
  }
  return ctx;
}
