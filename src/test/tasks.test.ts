import { describe, it, expect } from "vitest";
import { isOverdue } from "@/lib/tasks";

describe("isOverdue", () => {
  it("open task past its due date is overdue", () => {
    expect(isOverdue({ due_date: "2026-10-01", status: "todo" }, "2026-10-15")).toBe(true);
  });
  it("completed task is never overdue", () => {
    expect(isOverdue({ due_date: "2026-10-01", status: "done" }, "2026-10-15")).toBe(false);
  });
  it("task due today is not overdue", () => {
    expect(isOverdue({ due_date: "2026-10-15", status: "todo" }, "2026-10-15")).toBe(false);
  });
});
