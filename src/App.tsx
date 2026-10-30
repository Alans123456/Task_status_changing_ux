import React, { useState, useEffect } from "react";
import { Task, LOCAL_STORAGE_KEY, INITIAL_MOCK_TASKS } from "@/types/task";
import { KanbanBoard } from "@/components/KanbanBoard";
import { LegacyTasksGrid } from "@/components/LegacyTasksGrid";
import { Toaster } from "sonner";
import { Kanban, Table as TableIcon, Sparkles, Layers, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentView, setCurrentView] = useState<"legacy" | "kanban">("legacy");

  // Load shared tasks on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        setTasks(JSON.parse(saved));
      } else {
        setTasks(INITIAL_MOCK_TASKS);
      }
    } catch {
      setTasks(INITIAL_MOCK_TASKS);
    }
  }, []);

  // Save to localStorage when tasks change
  useEffect(() => {
    if (tasks.length > 0) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(tasks));
    }
  }, [tasks]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      {/* Top Navigation & View Switcher */}
      <header className="border-b bg-white dark:bg-slate-900 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg text-white shadow transition-colors ${
              currentView === "legacy" ? "bg-amber-600" : "bg-blue-600"
            }`}>
              {currentView === "legacy" ? (
                <TableIcon className="h-5 w-5" />
              ) : (
                <Kanban className="h-5 w-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-base sm:text-lg leading-tight tracking-tight">
                  Task Workflow System
                </h1>
                <Badge
                  variant="outline"
                  className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 ${
                    currentView === "legacy"
                      ? "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300"
                      : "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300"
                  }`}
                >
                  {currentView === "legacy" ? "Legacy Grid (V1)" : "Modern Kanban (V2)"}
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground hidden sm:block">
                Comparison Demo: Tabular Dropdowns vs. Interactive Kanban
              </p>
            </div>
          </div>

          {/* Central View Switcher Tabs (Perfect for video presentation) */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setCurrentView("legacy")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentView === "legacy"
                  ? "bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-300 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <TableIcon className="h-3.5 w-3.5" />
              <span>Legacy Grid</span>
              <span className="text-[10px] px-1.5 py-0.2 bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 rounded">
                V1
              </span>
            </button>

            <button
              onClick={() => setCurrentView("kanban")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentView === "kanban"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Modern Kanban</span>
              <span className="text-[10px] px-1.5 py-0.2 bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 rounded">
                V2
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentView === "legacy" ? (
          <LegacyTasksGrid
            tasks={tasks}
            setTasks={setTasks}
            onSwitchToKanban={() => setCurrentView("kanban")}
          />
        ) : (
          <KanbanBoard
            tasks={tasks}
            setTasks={setTasks}
            onSwitchToLegacy={() => setCurrentView("legacy")}
          />
        )}
      </main>

      {/* Footer / Video Demo Helper */}
      <footer className="border-t py-4 text-center text-xs text-muted-foreground bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            25-Min Demo Ready: Tasks are synchronized across both views in real time via local storage.
          </span>
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span>Client State: Live ({tasks.length} Tasks)</span>
          </div>
        </div>
      </footer>

      {/* Toast Notifications */}
      <Toaster position="top-right" richColors closeButton />
    </div>
  );
}

export default App;
