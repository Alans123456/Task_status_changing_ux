import { describe, it, expect, beforeEach } from "vitest";

// ==========================================
// 1. PIPELINE & SWIPE LOGIC TESTS
// ==========================================
const PIPELINE_ORDER = ["Pending", "In Progress", "Review", "Completed"];

function getNextStatus(currentStatus: string, direction: "next" | "prev"): string | null {
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
}

describe("Kanban Swipe & Pipeline Logic", () => {
  it("should advance status from Pending to In Progress on swipe right", () => {
    const next = getNextStatus("Pending", "next");
    expect(next).toBe("In Progress");
  });

  it("should advance status from In Progress to Review on swipe right", () => {
    const next = getNextStatus("In Progress", "next");
    expect(next).toBe("Review");
  });

  it("should advance status from Review to Completed on swipe right", () => {
    const next = getNextStatus("Review", "next");
    expect(next).toBe("Completed");
  });

  it("should return null when trying to advance past Completed", () => {
    const next = getNextStatus("Completed", "next");
    expect(next).toBeNull();
  });

  it("should move status backwards on swipe left", () => {
    const prev = getNextStatus("Review", "prev");
    expect(prev).toBe("In Progress");
  });

  it("should return null when trying to move left from Pending", () => {
    const prev = getNextStatus("Pending", "prev");
    expect(prev).toBeNull();
  });
});

// ==========================================
// 2. FORM VALIDATION LOGIC TESTS
// ==========================================
function validateTaskInput(formData: {
  title: string;
  description: string;
  projectName: string;
  estimatedHours: string | number;
}) {
  const errors: Record<string, string> = {};

  if (!formData.title || !formData.title.trim()) {
    errors.title = "Task title is required.";
  } else if (formData.title.trim().length < 4) {
    errors.title = "Task title must be at least 4 characters.";
  }

  if (!formData.description || !formData.description.trim()) {
    errors.description = "Task description is required.";
  }

  if (!formData.projectName || !formData.projectName.trim()) {
    errors.projectName = "Project name is required.";
  }

  if (!formData.estimatedHours || Number(formData.estimatedHours) <= 0) {
    errors.estimatedHours = "Estimated hours must be greater than 0.";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

describe("Kanban Form Validation Logic", () => {
  it("should fail validation when fields are empty", () => {
    const result = validateTaskInput({
      title: "",
      description: "",
      projectName: "",
      estimatedHours: "0",
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.title).toBe("Task title is required.");
    expect(result.errors.description).toBe("Task description is required.");
    expect(result.errors.projectName).toBe("Project name is required.");
    expect(result.errors.estimatedHours).toBe("Estimated hours must be greater than 0.");
  });

  it("should fail validation when title is less than 4 characters", () => {
    const result = validateTaskInput({
      title: "Bug",
      description: "Sample description",
      projectName: "Core App",
      estimatedHours: "4",
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.title).toBe("Task title must be at least 4 characters.");
  });

  it("should pass validation when all fields meet constraints", () => {
    const result = validateTaskInput({
      title: "Integrate Stripe Webhook",
      description: "Handle subscription events",
      projectName: "Payment Gateway",
      estimatedHours: "6",
    });

    expect(result.isValid).toBe(true);
    expect(Object.keys(result.errors).length).toBe(0);
  });
});

// ==========================================
// 3. OPTIMISTIC UPDATE & STORAGE PERSISTENCE
// ==========================================
describe("Optimistic Task State & Persistence", () => {
  const initialTasks = [
    { id: "task-1", name: "Build UI", task_status: "Pending" },
    { id: "task-2", name: "Write API", task_status: "In Progress" },
  ];

  it("should optimistically update task status in memory", () => {
    const taskIdToMove = "task-1";
    const newStatus = "Review";

    const updatedTasks = initialTasks.map((t) =>
      t.id === taskIdToMove ? { ...t, task_status: newStatus } : t
    );

    expect(updatedTasks.find((t) => t.id === "task-1")?.task_status).toBe("Review");
    expect(updatedTasks.find((t) => t.id === "task-2")?.task_status).toBe("In Progress");
  });

  it("should prepend newly created task to top of list", () => {
    const newTask = { id: "task-3", name: "Deploy to Prod", task_status: "Pending" };
    const taskList = [newTask, ...initialTasks];

    expect(taskList.length).toBe(3);
    expect(taskList[0].id).toBe("task-3");
  });
});
