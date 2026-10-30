import React, { useState, useMemo } from "react";
import { Task, LOCAL_STORAGE_KEY, INITIAL_MOCK_TASKS } from "@/types/task";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Search,
  RefreshCw,
  FolderKanban,
  Edit2,
  Calendar,
  Clock,
  AlertTriangle,
  ArrowRight,
  Loader2,
  Table as TableIcon,
  CheckCircle,
} from "lucide-react";

interface LegacyTasksGridProps {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  onSwitchToKanban: () => void;
}

const statusOptions = ["Pending", "In Progress", "Review", "Completed", "On Hold"];

const priorityColors: Record<string, string> = {
  high: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200",
  low: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200",
};

const statusBadgeStyles: Record<string, string> = {
  Pending: "bg-orange-100 text-orange-800 border-orange-200",
  "In Progress": "bg-blue-100 text-blue-800 border-blue-200",
  Review: "bg-purple-100 text-purple-800 border-purple-200",
  Completed: "bg-green-100 text-green-800 border-green-200",
  "On Hold": "bg-gray-100 text-gray-800 border-gray-200",
};

export function LegacyTasksGrid({ tasks, setTasks, onSwitchToKanban }: LegacyTasksGridProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);

  // Edit Modal State
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    title: "",
    status: "Pending",
    priority: "Medium",
    estimatedHours: "4",
  });
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const matchesSearch =
        (t.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.description || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.project_details?.title || "").toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || t.task_status.toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [tasks, searchTerm, statusFilter]);

  // Handle rigid dropdown status change with simulated server delay
  const handleDropdownStatusChange = (taskId: string, newStatus: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.task_status === newStatus) return;

    setUpdatingTaskId(taskId);
    toast.loading(`Updating task "${task.name}" to ${newStatus}...`, { id: "legacy-update" });

    // Simulate legacy slow server response
    setTimeout(() => {
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, task_status: newStatus } : t))
      );
      setUpdatingTaskId(null);
      toast.success(`[Legacy DB] Status saved: ${newStatus}`, { id: "legacy-update" });
    }, 550);
  };

  // Open Edit Dialog
  const handleOpenEdit = (task: Task) => {
    setEditingTask(task);
    setEditFormData({
      title: task.name,
      status: task.task_status,
      priority: task.priority,
      estimatedHours: String(task.estimatedHours || 4),
    });
    setIsEditDialogOpen(true);
  };

  // Save changes from Edit Dialog
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;

    setIsSavingEdit(true);
    setTimeout(() => {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === editingTask.id
            ? {
                ...t,
                name: editFormData.title,
                task_status: editFormData.status,
                priority: editFormData.priority,
                estimatedHours: Number(editFormData.estimatedHours),
              }
            : t
        )
      );
      setIsSavingEdit(false);
      setIsEditDialogOpen(false);
      toast.success(`Task "${editFormData.title}" updated via edit dialog.`);
    }, 500);
  };

  const resetToSampleData = () => {
    setTasks(INITIAL_MOCK_TASKS);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(INITIAL_MOCK_TASKS));
    toast.info("Tasks reset to original demo state.");
  };

  return (
    <div className="space-y-6">
      {/* Legacy UX Callout Banner */}
      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-amber-100 dark:bg-amber-900/60 rounded-lg text-amber-700 dark:text-amber-300 mt-0.5">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-amber-900 dark:text-amber-200">
                Legacy Task Grid (Version 1.0)
              </span>
              <Badge variant="outline" className="text-[10px] bg-amber-100/50 text-amber-800 border-amber-300">
                Bottleneck Demo
              </Badge>
            </div>
            <p className="text-xs text-amber-700 dark:text-amber-300/80 mt-1 max-w-2xl leading-relaxed">
              <strong>Presenter note:</strong> Show how rigid this tabular view is. Changing a task status requires
              selecting from individual row dropdowns or clicking "Edit" for a multi-step modal. There is no visual pipeline flow.
            </p>
          </div>
        </div>
        <Button
          onClick={onSwitchToKanban}
          className="bg-blue-600 hover:bg-blue-700 text-white shadow text-xs shrink-0 self-end sm:self-center"
        >
          Open Modern Kanban Board
          <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
        </Button>
      </div>

      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search table rows..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-64 h-9 text-xs"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36 h-9 text-xs">
              <SelectValue placeholder="Status Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {statusOptions.map((st) => (
                <SelectItem key={st} value={st.toLowerCase()}>
                  {st}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(searchTerm || statusFilter !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("all");
              }}
              className="h-9 text-xs"
            >
              Clear Filters
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={resetToSampleData} className="h-9 text-xs">
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Reset Demo Data
          </Button>
        </div>
      </div>

      {/* The Tabular Legacy Grid */}
      <Card className="shadow-sm border-slate-200 dark:border-slate-800">
        <CardHeader className="p-4 border-b bg-slate-50/50 dark:bg-slate-900/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TableIcon className="h-4 w-4 text-slate-500" />
              <CardTitle className="text-sm font-semibold">Legacy Projects Task Grid</CardTitle>
              <Badge variant="outline" className="text-xs ml-1">
                {filteredTasks.length} {filteredTasks.length === 1 ? "task" : "tasks"}
              </Badge>
            </div>
            <span className="text-xs text-muted-foreground">Status updates require manual dropdown selection</span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[30%]">Task Name & Context</TableHead>
                <TableHead className="w-[20%]">Project</TableHead>
                <TableHead className="w-[15%]">Assignee</TableHead>
                <TableHead className="w-[10%]">Priority</TableHead>
                <TableHead className="w-[15%]">Status (Dropdown)</TableHead>
                <TableHead className="w-[10%] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTasks.map((task) => {
                const isUpdating = updatingTaskId === task.id;
                const assignee = task.assigned_to?.[0];
                const assigneeName = assignee ? `${assignee.first_name} ${assignee.last_name}` : "Unassigned";

                return (
                  <TableRow key={task.id} className={isUpdating ? "opacity-60 bg-slate-50 dark:bg-slate-900" : ""}>
                    {/* Task Title & Description */}
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium text-xs text-slate-900 dark:text-slate-100 flex items-center gap-2">
                          {task.name}
                          {task.task_status === "Completed" && (
                            <CheckCircle className="h-3 w-3 text-green-600 inline shrink-0" />
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground line-clamp-1">{task.description}</p>
                      </div>
                    </TableCell>

                    {/* Project */}
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                        <FolderKanban className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                        <span className="truncate max-w-[140px]">{task.project_details?.title || "Internal"}</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {task.project_details?.client?.organization_name || "Internal"}
                      </div>
                    </TableCell>

                    {/* Assignee */}
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Avatar className="h-5 w-5 text-[9px] border">
                          <AvatarFallback className="bg-slate-200 dark:bg-slate-700">
                            {(assignee?.first_name || "U")[0]}
                            {(assignee?.last_name || "M")[0]}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-slate-700 dark:text-slate-300 truncate">{assigneeName}</span>
                      </div>
                    </TableCell>

                    {/* Priority */}
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={`text-[10px] px-1.5 py-0 ${
                          priorityColors[(task.priority || "medium").toLowerCase()] || priorityColors.medium
                        }`}
                      >
                        {task.priority}
                      </Badge>
                    </TableCell>

                    {/* Status Dropdown (Rigid legacy control) */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {isUpdating ? (
                          <div className="flex items-center gap-1 text-[11px] text-blue-600 font-medium">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            <span>Saving...</span>
                          </div>
                        ) : (
                          <Select
                            value={task.task_status}
                            onValueChange={(val) => handleDropdownStatusChange(task.id, val)}
                          >
                            <SelectTrigger className="h-8 text-xs w-[130px] border-slate-200">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {statusOptions.map((st) => (
                                <SelectItem key={st} value={st} className="text-xs">
                                  {st}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </TableCell>

                    {/* Actions: Edit Modal */}
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenEdit(task)}
                        className="h-7 px-2 text-[11px]"
                      >
                        <Edit2 className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}

              {filteredTasks.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-xs text-muted-foreground">
                    No tasks found matching your filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Task Status Modal (Classic form-based edit) */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Edit Task (Legacy Modal)</DialogTitle>
            <DialogDescription className="text-xs">
              Demonstrate the clunky 3-step process needed to change details in legacy software.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveEdit} className="space-y-4 py-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Task Title</label>
              <Input
                value={editFormData.title}
                onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Status</label>
                <Select
                  value={editFormData.status}
                  onValueChange={(val) => setEditFormData({ ...editFormData, status: val })}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((st) => (
                      <SelectItem key={st} value={st} className="text-xs">
                        {st}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Priority</label>
                <Select
                  value={editFormData.priority}
                  onValueChange={(val) => setEditFormData({ ...editFormData, priority: val })}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="High" className="text-xs">
                      High
                    </SelectItem>
                    <SelectItem value="Medium" className="text-xs">
                      Medium
                    </SelectItem>
                    <SelectItem value="Low" className="text-xs">
                      Low
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isSavingEdit} className="bg-blue-600 hover:bg-blue-700 text-white">
                {isSavingEdit ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
