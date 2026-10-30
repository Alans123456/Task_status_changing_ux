export interface Task {
  id: string;
  name: string;
  description: string;
  task_status: string; // "Pending" | "In Progress" | "Review" | "Completed" | "On Hold"
  priority: string; // "High" | "Medium" | "Low"
  due_date: string;
  estimatedHours: number;
  tags?: string;
  project_details: {
    id: string;
    title: string;
    client: {
      name: string;
      organization_name: string;
    };
  };
  assigned_to: Array<{
    id: string;
    first_name: string;
    last_name: string;
  }>;
}

export const LOCAL_STORAGE_KEY = "local_kanban_tasks";

export const INITIAL_MOCK_TASKS: Task[] = [
  {
    id: "task-101",
    name: "Design High-Fidelity Checkout Flow",
    description: "Create interactive Figma prototypes with mobile-responsive payment screens.",
    task_status: "Pending",
    priority: "High",
    due_date: new Date(Date.now() + 86400000 * 2).toISOString(),
    estimatedHours: 12,
    tags: "UI/UX, Figma",
    project_details: {
      id: "proj-1",
      title: "Mobile POS Redesign",
      client: { name: "RetailCorp Ltd.", organization_name: "FinTech Retail" },
    },
    assigned_to: [{ id: "u1", first_name: "Sarah", last_name: "Connor" }],
  },
  {
    id: "task-102",
    name: "Implement Optimistic Drag-and-Drop",
    description: "Connect touch sensors and prevent re-render lags using normalized state.",
    task_status: "In Progress",
    priority: "High",
    due_date: new Date(Date.now() + 86400000 * 1).toISOString(),
    estimatedHours: 8,
    tags: "Frontend, React",
    project_details: {
      id: "proj-1",
      title: "Mobile POS Redesign",
      client: { name: "RetailCorp Ltd.", organization_name: "FinTech Retail" },
    },
    assigned_to: [{ id: "u2", first_name: "Alex", last_name: "Rivera" }],
  },
  {
    id: "task-103",
    name: "Stripe Webhook Event Handlers",
    description: "Listen for charge.succeeded and update merchant settlement accounts.",
    task_status: "Review",
    priority: "Medium",
    due_date: new Date(Date.now() + 86400000 * 3).toISOString(),
    estimatedHours: 6,
    tags: "Backend, Stripe",
    project_details: {
      id: "proj-2",
      title: "Payment Gateway Core",
      client: { name: "PayGlobal Inc.", organization_name: "E-Commerce" },
    },
    assigned_to: [{ id: "u3", first_name: "David", last_name: "Kim" }],
  },
  {
    id: "task-104",
    name: "Automate Release Builds in CI/CD",
    description: "Set up GitHub Actions to deploy preview builds automatically on pull requests.",
    task_status: "Completed",
    priority: "Low",
    due_date: new Date(Date.now() - 86400000).toISOString(),
    estimatedHours: 4,
    tags: "DevOps, CI/CD",
    project_details: {
      id: "proj-2",
      title: "Payment Gateway Core",
      client: { name: "PayGlobal Inc.", organization_name: "E-Commerce" },
    },
    assigned_to: [{ id: "u1", first_name: "Sarah", last_name: "Connor" }],
  },
];
