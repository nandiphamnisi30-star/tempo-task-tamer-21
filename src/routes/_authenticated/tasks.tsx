import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Sparkles, Plus, Trash2, Clock } from "lucide-react";
import { planTasks, type PlannedTask } from "@/lib/ai.functions";
import { supabase } from "@/integrations/supabase/client";
import { tasksQuery, todayISO, isOverdue, formatDue, PRIORITY_RANK, type Task } from "@/lib/tasks";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/tasks")({
  head: () => ({
    meta: [
      { title: "AI Task Planner — Tempo" },
      { name: "description", content: "Create, prioritize, schedule and track your tasks with AI." },
      { property: "og:title", content: "AI Task Planner — Tempo" },
      { property: "og:description", content: "Plan and track tasks with AI." },
    ],
  }),
  component: TasksPage,
});

const prioVariant = { high: "destructive", medium: "default", low: "secondary" } as const;

function TasksPage() {
  const qc = useQueryClient();
  const { data: tasks = [] } = useQuery(tasksQuery);
  const [dump, setDump] = useState("");
  const [plan, setPlan] = useState<PlannedTask[] | null>(null);
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [prio, setPrio] = useState("medium");
  const [filter, setFilter] = useState("open");
  const run = useServerFn(planTasks);
  const refresh = () => qc.invalidateQueries({ queryKey: ["tasks"] });

  const ai = useMutation({
    mutationFn: () => run({ data: { input: dump, today: todayISO() } }),
    onSuccess: (r) => setPlan(r.tasks),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Planning failed"),
  });

  const savePlan = async () => {
    if (!plan?.length) return;
    const { error } = await supabase.from("tasks").insert(
      plan.map((p) => ({
        title: p.title,
        description: p.description,
        priority: p.priority,
        due_date: p.due_date && /^\d{4}-\d{2}-\d{2}$/.test(p.due_date) ? p.due_date : null,
        estimated_minutes: p.estimated_minutes ? Math.round(p.estimated_minutes) : null,
        source: "ai",
      })),
    );
    if (error) { toast.error(error.message); return; }
    toast.success(`${plan.length} tasks added`);
    setPlan(null);
    setDump("");
    refresh();
  };

  const addManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const { error } = await supabase.from("tasks").insert({ title: title.trim(), due_date: due || null, priority: prio });
    if (error) { toast.error(error.message); return; }
    setTitle(""); setDue("");
    refresh();
  };

  const update = async (t: Task, patch: Partial<Task>) => {
    const { error } = await supabase.from("tasks").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", t.id);
    if (error) toast.error(error.message);
    refresh();
  };
  const remove = async (t: Task) => {
    const { error } = await supabase.from("tasks").delete().eq("id", t.id);
    if (error) toast.error(error.message);
    refresh();
  };

  const today = todayISO();
  const shown = useMemo(() => {
    const list = tasks.filter((t) =>
      filter === "open" ? t.status !== "done" : filter === "done" ? t.status === "done" : filter === "overdue" ? isOverdue(t, today) : true,
    );
    return list.sort(
      (a, b) =>
        (PRIORITY_RANK[a.priority] ?? 1) - (PRIORITY_RANK[b.priority] ?? 1) ||
        (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999"),
    );
  }, [tasks, filter, today]);

  return (
    <>
      <PageHeader title="AI task planner" subtitle="Brain-dump everything on your plate — get back a prioritized, scheduled plan." />
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-2">
          <div className="card-soft space-y-3 p-6">
            <h2 className="text-xl">Plan with AI</h2>
            <Textarea rows={7} value={dump} onChange={(e) => setDump(e.target.value)} placeholder="e.g. Finish Q3 report by Friday, prep slides for Monday's client call, book dentist, review Sam's PR…" />
            <Button className="w-full" onClick={() => ai.mutate()} disabled={ai.isPending || dump.trim().length < 3}>
              {ai.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Sparkles className="mr-2 size-4" />}
              {ai.isPending ? "Planning…" : "Create plan"}
            </Button>
            {plan && (
              <div className="space-y-2 pt-2">
                {plan.length === 0 && <p className="text-sm text-muted-foreground">No tasks found in that text.</p>}
                {plan.map((p, i) => (
                  <div key={i} className="rounded-lg bg-muted/60 p-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{p.title}</span>
                      <Badge variant={prioVariant[p.priority]}>{p.priority}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDue(p.due_date)}{p.estimated_minutes ? ` · ~${p.estimated_minutes} min` : ""}
                    </p>
                  </div>
                ))}
                {plan.length > 0 && (
                  <div className="flex gap-2">
                    <Button className="flex-1" onClick={savePlan}>Add all to my tasks</Button>
                    <Button variant="ghost" onClick={() => setPlan(null)}>Discard</Button>
                  </div>
                )}
              </div>
            )}
          </div>

          <form onSubmit={addManual} className="card-soft space-y-3 p-6">
            <h2 className="text-xl">Quick add</h2>
            <Input placeholder="Task title" value={title} onChange={(e) => setTitle(e.target.value)} />
            <div className="flex gap-2">
              <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
              <Select value={prio} onValueChange={setPrio}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" variant="secondary" className="w-full"><Plus className="mr-1 size-4" />Add task</Button>
          </form>
        </div>

        <div className="card-soft p-6 lg:col-span-3">
          <Tabs value={filter} onValueChange={setFilter} className="mb-4">
            <TabsList>
              <TabsTrigger value="open">Open</TabsTrigger>
              <TabsTrigger value="overdue">Overdue</TabsTrigger>
              <TabsTrigger value="done">Done</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>
          </Tabs>
          {shown.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No tasks here.</p>
          ) : (
            <ul className="divide-y divide-border">
              {shown.map((t) => (
                <li key={t.id} className="flex items-start gap-3 py-3">
                  <Checkbox
                    className="mt-1"
                    checked={t.status === "done"}
                    onCheckedChange={(c) => update(t, { status: c ? "done" : "todo", completed_at: c ? new Date().toISOString() : null })}
                  />
                  <div className="min-w-0 flex-1">
                    <p className={t.status === "done" ? "text-muted-foreground line-through" : "font-medium"}>{t.title}</p>
                    {t.description && <p className="text-xs text-muted-foreground">{t.description}</p>}
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                      <Badge variant={prioVariant[t.priority as keyof typeof prioVariant] ?? "secondary"}>{t.priority}</Badge>
                      <span className={isOverdue(t, today) ? "font-semibold text-destructive" : "text-muted-foreground"}>
                        {isOverdue(t, today) ? "Overdue · " : ""}{formatDue(t.due_date)}
                      </span>
                      {t.estimated_minutes && <span className="flex items-center gap-1 text-muted-foreground"><Clock className="size-3" />{t.estimated_minutes}m</span>}
                    </div>
                  </div>
                  {t.status !== "done" && (
                    <Select value={t.status} onValueChange={(v) => update(t, { status: v })}>
                      <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todo">To do</SelectItem>
                        <SelectItem value="in_progress">In progress</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  <Button size="icon" variant="ghost" onClick={() => remove(t)} aria-label="Delete task">
                    <Trash2 className="size-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
