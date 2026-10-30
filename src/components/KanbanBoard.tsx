"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { Task, LOCAL_STORAGE_KEY, INITIAL_MOCK_TASKS } from "@/types/task";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  Search,
  Clock,
  Calendar,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Plus,
  FolderKanban,
  Table as TableIcon,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Trash2,
  CheckCircle2,
  BarChart3,
  HelpCircle,
  Flame,
  Layers,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";

// --- Color Configurations ---
const priorityColors: Record<string, string> = {
  high: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200",
  low: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200",
};

const statusColors: Record<string, string> = {
  pending: "bg-orange-50/50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-900/40",
  "in-progress": "bg-blue-50/50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-900/40",
  review: "bg-purple-50/50 border-purple-200 dark:bg-purple-950/20 dark:border-purple-900/40",
  completed: "bg-green-50/50 border-green-200 dark:bg-green-950/20 dark:border-green-900/40",
  "on-hold": "bg-gray-50/50 border-gray-200 dark:bg-gray-900/20 dark:border-gray-800",
};

const statusMapping: Record<string, string> = {
  pending: "Pending",
  "in-progress": "In Progress",
  review: "Review",
  completed: "Completed",
  "on-hold": "On Hold",
};

// Sequential pipeline for swipe navigation
const PIPELINE_ORDER = ["Pending", "In Progress", "Review", "Completed"];

interface KanbanBoardProps {
  tasks?: Task[];
  setTasks?: React.Dispatch<React.SetStateAction<Task[]>>;
  onSwitchToLegacy?: () => void;
}

export function KanbanBoard({
  tasks: controlledTasks,
  setTasks: controlledSetTasks,
  onSwitchToLegacy,
}: KanbanBoardProps = {}) {
  const [internalTasks, setInternalTasks] = useState<Task[]>([]);
  
  // Use controlled tasks if provided, otherwise internal state
  const tasks = controlledTasks ?? internalTasks;
  const setTasks = controlledSetTasks ?? setInternalTasks;

  const [draggedTask, setDraggedTask] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [swipingTaskId, setSwipingTaskId] = useState<string | null>(null);
  const [swipeDirection, setSwipeDirection] = useState<"next" | "prev" | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [collapsedColumns, setCollapsedColumns] = useState<Set<string>>(new Set());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCheatSheetOpen, setIsCheatSheetOpen] = useState(false);

  // Swipe touch tracking refs
  const touchStartXRef = useRef<number | null>(null);
  const touchCurrentXRef = useRef<number | null>(null);

  // --- Form State & Validation ---
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    projectName: "",
    organization: "",
    priority: "Medium",
    status: "pending",
    assignee: "Alex Rivera",
    estimatedHours: "4",
    dueDate: new Date().toISOString().split("T")[0],
    tags: "Frontend, Task",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const columns = [
    { id: "pending", title: "Pending", status: "pending", icon: "⏳" },
    { id: "in-progress", title: "In Progress", status: "in-progress", icon: "🔄" },
    { id: "review", title: "Review", status: "review", icon: "👁️" },
    { id: "completed", title: "Completed", status: "completed", icon: "✅" },
    { id: "on-hold", title: "On Hold", status: "on-hold", icon: "⏸️" },
  ];

  // If using internal state only, load from localStorage
  useEffect(() => {
    if (!controlledTasks) {
      try {
        const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (saved) {
          setInternalTasks(JSON.parse(saved));
        } else {
          setInternalTasks(INITIAL_MOCK_TASKS);
        }
      } catch {
        setInternalTasks(INITIAL_MOCK_TASKS);
      }
    }
  }, [controlledTasks]);

  // Save to localStorage whenever tasks change
  useEffect(() => {
    if (tasks.length > 0) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(tasks));
    }
  }, [tasks]);

  // =========================================================================
  // CORE DEMO FUNCTION 1: SWIPE & QUICK ADVANCE PIPELINE
  // Allows advancing/reverting cards via touch swipe gesture or one-click micro-controls
  // =========================================================================
  const getNextStatus = (currentStatus: string, direction: "next" | "prev"): string | null => {
    if (currentStatus === "On Hold") {
      return direction === "next" ? "In Progress" : "Pending";
    }

    const currentIndex = PIPELINE_ORDER.indexOf(currentStatus);
    if (currentIndex === -1) return null;

    if (direction === "next") {
      return currentIndex < PIPELINE_ORDER.length - 1 ? PIPELINE_ORDER[currentIndex + 1] : null;
    } else {
      return currentIndex > 0 ? PIPELINE_ORDER[currentIndex - 1] : null;
    }
  };

  const handleSwipeMove = (taskId: string, direction: "next" | "prev") => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const targetStatus = getNextStatus(task.task_status, direction);
    if (!targetStatus) {
      toast.info(`Task is already at the ${direction === "next" ? "end" : "start"} of the pipeline.`);
      return;
    }

    // Trigger sliding animation & optimistic update
    setSwipingTaskId(taskId);
    setSwipeDirection(direction);

    setTimeout(() => {
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, task_status: targetStatus } : t))
      );
      setSwipingTaskId(null);
      setSwipeDirection(null);
      toast.success(
        `Swiped "${task.name.slice(0, 22)}..." ${direction === "next" ? "➔" : "⬅"} ${targetStatus}`,
        { duration: 2500 }
      );
    }, 180);
  };

  // Touch Swipe Handlers for mobile, tablet, or touchpad
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
    touchCurrentXRef.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchCurrentXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (taskId: string) => {
    if (touchStartXRef.current === null || touchCurrentXRef.current === null) return;
    const deltaX = touchCurrentXRef.current - touchStartXRef.current;
    const SWIPE_THRESHOLD = 50;

    if (deltaX > SWIPE_THRESHOLD) {
      // Swiped right -> Advance to Next
      handleSwipeMove(taskId, "next");
    } else if (deltaX < -SWIPE_THRESHOLD) {
      // Swiped left -> Move to Previous
      handleSwipeMove(taskId, "prev");
    }

    touchStartXRef.current = null;
    touchCurrentXRef.current = null;
  };

  // =========================================================================
  // CORE DEMO FUNCTION 2: FORM VALIDATION ENGINE
  // Real-time client-side checks for the "Add Task" modal
  // =========================================================================
  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.title.trim()) {
      errors.title = "Task title is required.";
    } else if (formData.title.trim().length < 4) {
      errors.title = "Task title must be at least 4 characters.";
    }

    if (!formData.description.trim()) {
      errors.description = "Task description is required.";
    }

    if (!formData.projectName.trim()) {
      errors.projectName = "Project name is required.";
    }

    if (!formData.estimatedHours || Number(formData.estimatedHours) <= 0) {
      errors.estimatedHours = "Estimated hours must be greater than 0.";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error("Please fix form errors before submitting.");
      return;
    }

    const nameParts = formData.assignee.split(" ");
    const newTask: Task = {
      id: `task-${Date.now()}`,
      name: formData.title.trim(),
      description: formData.description.trim(),
      task_status: statusMapping[formData.status] || "Pending",
      priority: formData.priority,
      due_date: new Date(formData.dueDate).toISOString(),
      estimatedHours: Number(formData.estimatedHours),
      tags: formData.tags,
      project_details: {
        id: `proj-${Date.now()}`,
        title: formData.projectName,
        client: {
          name: "Direct Client",
          organization_name: formData.organization || "In-House",
        },
      },
      assigned_to: [
        {
          id: `u-${Date.now()}`,
          first_name: nameParts[0] || "Team",
          last_name: nameParts[1] || "Member",
        },
      ],
    };

    setTasks((prev) => [newTask, ...prev]);
    toast.success(`Task "${newTask.name}" created successfully!`);
    setIsDialogOpen(false);

    // Reset Form
    setFormData({
      title: "",
      description: "",
      projectName: "",
      organization: "",
      priority: "Medium",
      status: "pending",
      assignee: "Alex Rivera",
      estimatedHours: "4",
      dueDate: new Date().toISOString().split("T")[0],
      tags: "Frontend, Task",
    });
    setFormErrors({});
  };

  const handleDeleteTask = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const taskToDelete = tasks.find((t) => t.id === taskId);
    if (!taskToDelete) return;

    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    toast.success(`Task "${taskToDelete.name}" deleted.`, {
      action: {
        label: "Undo",
        onClick: () => setTasks((prev) => [taskToDelete, ...prev]),
      },
    });
  };

  // Filter Tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesSearch =
        (task.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (task.description || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (task.project_details?.title || "").toLowerCase().includes(searchTerm.toLowerCase());

      const matchesPriority =
        priorityFilter === "all" ||
        (task.priority || "").toLowerCase() === priorityFilter.toLowerCase();

      const matchesAssignee =
        assigneeFilter === "all" ||
        (task.assigned_to || []).some(
          (assignee: any) =>
            `${assignee?.first_name || ""} ${assignee?.last_name || ""}` === assigneeFilter
        );

      return matchesSearch && matchesPriority && matchesAssignee;
    });
  }, [tasks, searchTerm, priorityFilter, assigneeFilter]);

  const getTasksByStatus = (statusKey: string) => {
    const targetStatusName = statusMapping[statusKey];
    return filteredTasks.filter((task) => task.task_status === targetStatusName);
  };

  // =========================================================================
  // CORE DEMO FUNCTION 3: OPTIMISTIC DRAG-AND-DROP
  // =========================================================================
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTask(taskId);
    e.dataTransfer.setData("text/plain", taskId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverColumn !== columnId) {
      setDragOverColumn(columnId);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragEnd = () => {
    setDraggedTask(null);
    setDragOverColumn(null);
  };

  const handleDrop = async (e: React.DragEvent, newStatusKey: string) => {
    e.preventDefault();
    setDragOverColumn(null);

    const taskId = e.dataTransfer.getData("text/plain") || draggedTask;
    if (!taskId) return;

    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const newStatusName = statusMapping[newStatusKey];
    if (task.task_status === newStatusName) {
      setDraggedTask(null);
      return;
    }

    // 1. Optimistic UI update
    setUpdating(taskId);
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, task_status: newStatusName } : t))
    );

    toast.success(`Task moved to ${newStatusName}`);

    // 2. Simulated Async dispatch (instant feedback on frontend)
    setTimeout(() => {
      setUpdating(null);
      setDraggedTask(null);
    }, 250);
  };

  const toggleColumnCollapse = (columnId: string) => {
    setCollapsedColumns((prev) => {
      const next = new Set(prev);
      if (next.has(columnId)) next.delete(columnId);
      else next.add(columnId);
      return next;
    });
  };

  const resetToSampleData = () => {
    setTasks(INITIAL_MOCK_TASKS);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(INITIAL_MOCK_TASKS));
    toast.info("Board reset to sample tasks.");
  };

  // Metrics Calculations for Video Presentation
  const completedCount = tasks.filter((t) => t.task_status === "Completed").length;
  const inProgressCount = tasks.filter((t) => t.task_status === "In Progress").length;
  const totalHours = tasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);
  const completionPercentage = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Modern Workflow Highlight Banner with Video Cheat Sheet Button */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-800/60 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-600 rounded-lg text-white shadow-sm mt-0.5">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm text-blue-950 dark:text-blue-100">
                Modern Interactive Kanban Board (Version 2.0)
              </span>
              <Badge className="bg-blue-600 text-white text-[10px] hover:bg-blue-600">
                Drag & Drop + Gesture Swipe
              </Badge>
            </div>
            <p className="text-xs text-blue-800/80 dark:text-blue-300/80 mt-1 max-w-2xl leading-relaxed">
              <strong>Swipe Feature:</strong> Touch-swipe cards horizontally or click the quick micro-arrows (<code className="px-1 py-0.2 bg-blue-100 dark:bg-blue-900 rounded font-semibold text-[11px]">←</code> / <code className="px-1 py-0.2 bg-blue-100 dark:bg-blue-900 rounded font-semibold text-[11px]">→</code>) on any card to slide it straight into the next workflow column!
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCheatSheetOpen(true)}
            className="text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-indigo-950"
          >
            <HelpCircle className="h-3.5 w-3.5 mr-1.5" />
            Video Cheat Sheet
          </Button>

          {onSwitchToLegacy && (
            <Button
              variant="outline"
              size="sm"
              onClick={onSwitchToLegacy}
              className="text-xs border-blue-300 hover:bg-blue-50"
            >
              <TableIcon className="h-3.5 w-3.5 mr-1.5 text-slate-600" />
              Compare with Legacy Grid
            </Button>
          )}
        </div>
      </div>

      {/* SPRINT METRICS BAR (Great visual proof in the video) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/40 text-blue-600 rounded-lg">
            <Layers className="h-4 w-4" />
          </div>
          <div>
            <div className="text-[11px] text-muted-foreground font-medium">Total Tasks</div>
            <div className="text-base font-bold text-slate-900 dark:text-slate-100">{tasks.length}</div>
          </div>
        </div>

        <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
          <div className="p-2 bg-amber-100 dark:bg-amber-900/40 text-amber-600 rounded-lg">
            <Clock className="h-4 w-4" />
          </div>
          <div>
            <div className="text-[11px] text-muted-foreground font-medium">Total Est. Hours</div>
            <div className="text-base font-bold text-slate-900 dark:text-slate-100">{totalHours} hrs</div>
          </div>
        </div>

        <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/40 text-purple-600 rounded-lg">
            <Flame className="h-4 w-4" />
          </div>
          <div>
            <div className="text-[11px] text-muted-foreground font-medium">In Progress</div>
            <div className="text-base font-bold text-slate-900 dark:text-slate-100">{inProgressCount}</div>
          </div>
        </div>

        <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
          <div className="p-2 bg-green-100 dark:bg-green-900/40 text-green-600 rounded-lg">
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground font-medium">
              <span>Completion</span>
              <span className="font-bold text-green-600">{completionPercentage}%</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full mt-1 overflow-hidden">
              <div
                className="bg-green-500 h-full transition-all duration-300 rounded-full"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Top Controls: Search, Filters, and "Add Task" Modal */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks or projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-60 h-9"
            />
          </div>

          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-32 h-9">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>

          {(searchTerm || priorityFilter !== "all" || assigneeFilter !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchTerm("");
                setPriorityFilter("all");
                setAssigneeFilter("all");
              }}
              className="h-9 text-xs"
            >
              Reset Filters
            </Button>
          )}
        </div>

        {/* Right side: Add Task Form Modal & Sample Data Reset */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={resetToSampleData} className="h-9">
            <RefreshCw className="h-4 w-4 mr-1.5" />
            Reset Data
          </Button>

          {/* ADD TASK DIALOG WITH FORM VALIDATION */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-9 bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="h-4 w-4 mr-1.5" />
                Add New Task
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Task</DialogTitle>
                <DialogDescription>
                  Enter task details below. All tasks enter the Kanban board with instant validation.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleCreateTask} className="space-y-4 py-2">
                {/* Title */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Task Title *
                  </label>
                  <Input
                    placeholder="e.g., Integrate Stripe Webhooks"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                  {formErrors.title && (
                    <p className="text-xs text-red-500 font-medium">{formErrors.title}</p>
                  )}
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Description *
                  </label>
                  <Input
                    placeholder="Brief task context..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                  {formErrors.description && (
                    <p className="text-xs text-red-500 font-medium">{formErrors.description}</p>
                  )}
                </div>

                {/* Project Name */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Project Name *
                  </label>
                  <Input
                    placeholder="e.g., Mobile POS App"
                    value={formData.projectName}
                    onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                  />
                  {formErrors.projectName && (
                    <p className="text-xs text-red-500 font-medium">{formErrors.projectName}</p>
                  )}
                </div>

                {/* Priority & Status */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                      Priority
                    </label>
                    <Select
                      value={formData.priority}
                      onValueChange={(val) => setFormData({ ...formData, priority: val })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="High">High</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="Low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                      Initial Status
                    </label>
                    <Select
                      value={formData.status}
                      onValueChange={(val) => setFormData({ ...formData, status: val })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in-progress">In Progress</SelectItem>
                        <SelectItem value="review">Review</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="on-hold">On Hold</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Assignee & Estimated Hours */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                      Assignee
                    </label>
                    <Input
                      placeholder="Alex Rivera"
                      value={formData.assignee}
                      onChange={(e) => setFormData({ ...formData, assignee: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                      Est. Hours *
                    </label>
                    <Input
                      type="number"
                      placeholder="4"
                      value={formData.estimatedHours}
                      onChange={(e) => setFormData({ ...formData, estimatedHours: e.target.value })}
                    />
                    {formErrors.estimatedHours && (
                      <p className="text-xs text-red-500 font-medium">{formErrors.estimatedHours}</p>
                    )}
                  </div>
                </div>

                {/* Due Date & Tags */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                      Due Date
                    </label>
                    <Input
                      type="date"
                      value={formData.dueDate}
                      onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                      Tags (comma separated)
                    </label>
                    <Input
                      placeholder="Frontend, Bug"
                      value={formData.tags}
                      onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    />
                  </div>
                </div>

                <DialogFooter className="pt-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
                    Create Task
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Kanban Board Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {columns.map((column) => {
          const columnTasks = getTasksByStatus(column.id);
          const isCollapsed = collapsedColumns.has(column.id);
          const isTargeted = dragOverColumn === column.id;

          return (
            <div
              key={column.id}
              className={`flex flex-col min-h-[560px] p-3 rounded-xl border-2 transition-all duration-200 ${
                isTargeted
                  ? "border-blue-500 bg-blue-50/30 dark:bg-blue-950/40 scale-[1.01]"
                  : "border-slate-200/80 dark:border-slate-800"
              } ${statusColors[column.id]}`}
              onDragOver={(e) => handleDragOver(e, column.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, column.id)}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-200/50 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="text-base">{column.icon}</span>
                  <h3 className="font-semibold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    {column.title}
                  </h3>
                  <Badge variant="outline" className="text-xs px-1.5 py-0 font-bold">
                    {columnTasks.length}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleColumnCollapse(column.id)}
                  className="h-6 w-6 p-0 hover:bg-transparent"
                >
                  {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                </Button>
              </div>

              {/* Column Task Cards */}
              {!isCollapsed && (
                <ScrollArea className="flex-1 pr-1">
                  <div className="space-y-3 pb-2">
                    {columnTasks.map((task) => {
                      const isDragging = draggedTask === task.id;
                      const isBeingUpdated = updating === task.id;
                      const isSwiping = swipingTaskId === task.id;

                      const prevStatus = getNextStatus(task.task_status, "prev");
                      const nextStatus = getNextStatus(task.task_status, "next");

                      return (
                        <Card
                          key={task.id}
                          draggable={!isBeingUpdated && !isSwiping}
                          onDragStart={(e) => handleDragStart(e, task.id)}
                          onDragEnd={handleDragEnd}
                          onTouchStart={handleTouchStart}
                          onTouchMove={handleTouchMove}
                          onTouchEnd={() => handleTouchEnd(task.id)}
                          className={`group cursor-grab active:cursor-grabbing hover:shadow-md transition-all duration-200 relative overflow-hidden ${
                            isDragging ? "opacity-30 scale-95 border-dashed border-blue-500" : ""
                          } ${isBeingUpdated ? "animate-pulse" : ""} ${
                            isSwiping
                              ? swipeDirection === "next"
                                ? "translate-x-12 opacity-0 transition-transform duration-200"
                                : "-translate-x-12 opacity-0 transition-transform duration-200"
                              : "translate-x-0 opacity-100"
                          }`}
                        >
                          <CardHeader className="p-3 pb-1">
                            <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
                              <div className="flex items-center gap-1.5">
                                <FolderKanban className="h-3 w-3 text-blue-500 shrink-0" />
                                <span className="truncate max-w-[120px]">
                                  {task.project_details?.title || "Internal"}
                                </span>
                              </div>
                              <button
                                onClick={(e) => handleDeleteTask(task.id, e)}
                                title="Delete task"
                                className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-opacity p-0.5 rounded"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                            <CardTitle className="text-xs font-semibold leading-tight line-clamp-2">
                              {task.name}
                            </CardTitle>
                          </CardHeader>

                          <CardContent className="p-3 pt-1 space-y-2.5">
                            <p className="text-[11px] text-muted-foreground line-clamp-2">
                              {task.description}
                            </p>

                            {/* Tags */}
                            {task.tags && (
                              <div className="flex flex-wrap gap-1">
                                {task.tags
                                  .split(",")
                                  .slice(0, 2)
                                  .map((tag: string, i: number) => (
                                    <Badge key={i} variant="outline" className="text-[10px] px-1 py-0">
                                      {tag.trim()}
                                    </Badge>
                                  ))}
                              </div>
                            )}

                            {/* Priority & Assignee */}
                            <div className="flex items-center justify-between pt-1">
                              <Badge
                                variant="secondary"
                                className={`text-[10px] px-1.5 py-0 ${
                                  priorityColors[
                                    (task.priority || "medium").toLowerCase()
                                  ] || priorityColors.medium
                                }`}
                              >
                                {task.priority}
                              </Badge>

                              {/* Assignee Avatar */}
                              <div className="flex items-center gap-1">
                                <Avatar className="h-5 w-5 text-[9px] border">
                                  <AvatarFallback className="bg-slate-200 dark:bg-slate-700">
                                    {(task.assigned_to?.[0]?.first_name || "U")[0]}
                                    {(task.assigned_to?.[0]?.last_name || "M")[0]}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-[11px] text-muted-foreground">
                                  {task.assigned_to?.[0]?.first_name}
                                </span>
                              </div>
                            </div>

                            {/* Due Date & Hours */}
                            <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-slate-100 dark:border-slate-800">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                <span>{new Date(task.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                              </div>
                              {task.estimatedHours && (
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  <span>{task.estimatedHours}h</span>
                                </div>
                              )}
                            </div>

                            {/* SWIPE / QUICK ADVANCE MICRO-CONTROLS (VIDEO HIGHLIGHT) */}
                            <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1">
                              {prevStatus ? (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleSwipeMove(task.id, "prev")}
                                  className="h-6 px-1.5 text-[10px] text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 flex items-center gap-1"
                                  title={`Swipe Left: Move back to ${prevStatus}`}
                                >
                                  <ChevronLeft className="h-3 w-3" />
                                  <span className="hidden group-hover:inline">{prevStatus}</span>
                                  <span className="group-hover:hidden">Back</span>
                                </Button>
                              ) : (
                                <div />
                              )}

                              {nextStatus ? (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleSwipeMove(task.id, "next")}
                                  className="h-6 px-1.5 text-[10px] text-blue-600 font-medium hover:bg-blue-50 dark:hover:bg-blue-950 flex items-center gap-1 ml-auto"
                                  title={`Swipe Right: Advance to ${nextStatus}`}
                                >
                                  <span className="hidden group-hover:inline">{nextStatus}</span>
                                  <span className="group-hover:hidden">Advance</span>
                                  <ChevronRight className="h-3 w-3" />
                                </Button>
                              ) : (
                                <Badge variant="outline" className="text-[9px] text-green-700 bg-green-50 border-green-200 ml-auto">
                                  Finished
                                </Badge>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}

                    {columnTasks.length === 0 && (
                      <div className="text-center py-10 border border-dashed rounded-lg border-slate-200 dark:border-slate-800">
                        <p className="text-xs text-muted-foreground">Drop or swipe tasks here</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              )}
            </div>
          );
        })}
      </div>

      {/* VIDEO PRESENTATION CHEAT SHEET MODAL (Interactive helper for recording) */}
      <Dialog open={isCheatSheetOpen} onOpenChange={setIsCheatSheetOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-blue-600" />
              25-Minute Video Recording Guide
            </DialogTitle>
            <DialogDescription>
              Keep this outline handy to hit all key demonstration talking points while recording.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-xs text-slate-700 dark:text-slate-300 py-2">
            {/* Step 1 */}
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-900/50 space-y-1">
              <div className="font-bold text-amber-900 dark:text-amber-200 flex items-center justify-between">
                <span>1. Show Legacy View (ProjectsGrid)</span>
                <span className="text-[10px] bg-amber-200/60 dark:bg-amber-800 px-2 py-0.5 rounded">0:00 – 4:00</span>
              </div>
              <p>
                Switch to <strong>Legacy Grid</strong> tab. Point out:
              </p>
              <ul className="list-disc list-inside space-y-0.5 text-slate-600 dark:text-slate-400">
                <li>Static tabular rows with no pipeline overview</li>
                <li>Changing status requires dropdown hunting or clicking "Edit" for a multi-step modal</li>
                <li>Show the simulated 500ms server delay spinner ("Saving...")</li>
              </ul>
            </div>

            {/* Step 2 */}
            <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-900/50 space-y-1">
              <div className="font-bold text-blue-950 dark:text-blue-200 flex items-center justify-between">
                <span>2. Open Add Task Modal & Trigger Validation</span>
                <span className="text-[10px] bg-blue-200/60 dark:bg-blue-800 px-2 py-0.5 rounded">4:00 – 9:00</span>
              </div>
              <p>
                Click <strong>"Add New Task"</strong> button. Show real-time validation:
              </p>
              <ul className="list-disc list-inside space-y-0.5 text-slate-600 dark:text-slate-400">
                <li>Submit empty form ➔ Show <code className="bg-red-100 dark:bg-red-950 text-red-600 px-1 py-0.2 rounded font-mono">"Task title is required"</code></li>
                <li>Type 2 characters ➔ Show <code className="bg-red-100 dark:bg-red-950 text-red-600 px-1 py-0.2 rounded font-mono">"Task title must be at least 4 characters"</code></li>
                <li>Fill valid data and click Create Task ➔ Card instantly prepends to Pending column!</li>
              </ul>
            </div>

            {/* Step 3 */}
            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 rounded-lg border border-indigo-200 dark:border-indigo-900/50 space-y-1">
              <div className="font-bold text-indigo-950 dark:text-indigo-200 flex items-center justify-between">
                <span>3. Drag & Drop + Swipe Functionality Demo</span>
                <span className="text-[10px] bg-indigo-200/60 dark:bg-indigo-800 px-2 py-0.5 rounded">9:00 – 16:00</span>
              </div>
              <p>
                Demonstrate two modes of movement:
              </p>
              <ul className="list-disc list-inside space-y-0.5 text-slate-600 dark:text-slate-400">
                <li><strong>Drag and drop</strong> a card smoothly across Pending ➔ In Progress ➔ Review ➔ Completed</li>
                <li><strong>Swipe / Quick Advance</strong>: Click the <code className="bg-blue-100 px-1 rounded font-bold">Advance ➔</code> button or swipe on touch/trackpad to slide the card with animated transition</li>
                <li>Watch the top <strong>Completion % bar</strong> update automatically in real time!</li>
              </ul>
            </div>

            {/* Step 4 */}
            <div className="p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-200 dark:border-purple-900/50 space-y-1">
              <div className="font-bold text-purple-950 dark:text-purple-200 flex items-center justify-between">
                <span>4. Code Walkthrough (4 Key Functions)</span>
                <span className="text-[10px] bg-purple-200/60 dark:bg-purple-800 px-2 py-0.5 rounded">16:00 – 21:00</span>
              </div>
              <p>
                Open <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded font-mono">KanbanBoard.tsx</code> in your IDE and point to:
              </p>
              <ul className="list-disc list-inside space-y-0.5 text-slate-600 dark:text-slate-400">
                <li><code className="font-mono text-purple-700 dark:text-purple-300">handleSwipeMove</code>: Sequential pipeline advancement logic</li>
                <li><code className="font-mono text-purple-700 dark:text-purple-300">handleDrop</code>: Optimistic UI update with simulated async dispatch</li>
                <li><code className="font-mono text-purple-700 dark:text-purple-300">validateForm</code>: Real-time validation checks</li>
                <li><code className="font-mono text-purple-700 dark:text-purple-300">localStorage.setItem</code>: Zero-latency offline client persistence</li>
              </ul>
            </div>

            {/* Step 5 */}
            <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-900/50 space-y-1">
              <div className="font-bold text-green-950 dark:text-green-200 flex items-center justify-between">
                <span>5. Page Refresh & Client-Side Persistence Proof</span>
                <span className="text-[10px] bg-green-200/60 dark:bg-green-800 px-2 py-0.5 rounded">21:00 – 25:00</span>
              </div>
              <p>
                Hard refresh the browser (<code className="font-mono font-bold">F5</code>). Point out that all newly created tasks and swiped positions remain completely preserved without server latency!
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setIsCheatSheetOpen(false)} className="bg-blue-600 hover:bg-blue-700 text-white">
              Got it, let's record!
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
