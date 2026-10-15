import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Mail, NotebookPen, ListChecks, CalendarClock, CheckCircle2, AlertTriangle, ArrowUpRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { tasksQuery, isOverdue, formatDue, todayISO } from "@/lib/tasks";
import { PageHeader } from "@/components/AppShell";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_workspace/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Tempo" },
      { name: "description", content: "Your tasks, deadlines and AI tools at a glance." },
      { property: "og:title", content: "Dashboard — Tempo" },
      { property: "og:description", content: "Your productivity overview." },
    ],
  }),
  component: Dashboard,
});

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

function Dashboard() {
  const { data: tasks = [] } = useQuery(tasksQuery);
  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const { data } = await supabase.from("profiles").select("display_name").eq("id", u.user!.id).maybeSingle();
      return data;
    },
  });
  const { data: counts } = useQuery({
    queryKey: ["counts"],
    queryFn: async () => {
      const [e, m] = await Promise.all([
        supabase.from("emails").select("id", { count: "exact", head: true }),
        supabase.from("meeting_summaries").select("id", { count: "exact", head: true }),
      ]);
      return { emails: e.count ?? 0, meetings: m.count ?? 0 };
    },
  });

  const today = todayISO();
  const done = tasks.filter((t) => t.status === "done");
  const open = tasks.filter((t) => t.status !== "done");
  const overdue = open.filter((t) => isOverdue(t, today));
  const upcoming = open.filter((t) => t.due_date && t.due_date >= today).slice(0, 5);
  const pct = tasks.length ? Math.round((done.length / tasks.length) * 100) : 0;
  const recentDone = [...done].sort((a, b) => (b.completed_at ?? "").localeCompare(a.completed_at ?? "")).slice(0, 4);

  const stats = [
    { label: "Open tasks", value: open.length, icon: ListChecks },
    { label: "Completed", value: done.length, icon: CheckCircle2 },
    { label: "Overdue", value: overdue.length, icon: AlertTriangle },
    { label: "Emails written", value: counts?.emails ?? 0, icon: Mail },
  ];

  return (
    <>
      <PageHeader
        title={`${greeting()}${profile?.display_name ? `, ${profile.display_name}` : ""}`}
        subtitle="Here's where your work stands today."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="card-soft p-5">
            <Icon className="size-5 text-primary" />
            <p className="mt-4 font-display text-3xl">{value}</p>
            <p className="text-sm text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {[
          { to: "/email", icon: Mail, title: "Write an email", body: "Generate or polish in any tone" },
          { to: "/meetings", icon: NotebookPen, title: "Summarize a meeting", body: `${counts?.meetings ?? 0} summaries saved` },
          { to: "/tasks", icon: ListChecks, title: "Plan my tasks", body: "Let AI prioritize your list" },
        ].map(({ to, icon: Icon, title, body }) => (
          <Link key={to} to={to} className="card-soft group flex items-center gap-4 p-5 transition-shadow hover:shadow-lift">
            <span className="grid size-12 place-items-center rounded-xl bg-highlight text-highlight-foreground">
              <Icon className="size-5" />
            </span>
            <div className="flex-1">
              <p className="font-semibold">{title}</p>
              <p className="text-sm text-muted-foreground">{body}</p>
            </div>
            <ArrowUpRight className="size-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <section className="card-soft p-6 lg:col-span-2">
          <div className="mb-4 flex items-center gap-2">
            <CalendarClock className="size-5 text-primary" />
            <h2 className="text-xl">Upcoming deadlines</h2>
          </div>
          {overdue.length + upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground">No upcoming deadlines. <Link to="/tasks" className="text-primary hover:underline">Add tasks</Link></p>
          ) : (
            <ul className="divide-y divide-border">
              {[...overdue, ...upcoming].map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 py-3">
                  <span className="truncate">{t.title}</span>
                  <Badge variant={isOverdue(t, today) ? "destructive" : "secondary"}>
                    {isOverdue(t, today) ? "Overdue · " : ""}{formatDue(t.due_date)}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="card-soft p-6">
          <h2 className="text-xl">Progress</h2>
          <p className="mt-4 font-display text-5xl text-primary">{pct}%</p>
          <Progress value={pct} className="mt-3" />
          <p className="mt-2 text-sm text-muted-foreground">{done.length} of {tasks.length} tasks done</p>
          <h3 className="mt-6 text-sm font-semibold font-sans">Recently completed</h3>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            {recentDone.length === 0 ? <li>Nothing yet</li> : recentDone.map((t) => <li key={t.id} className="truncate line-through">{t.title}</li>)}
          </ul>
        </section>
      </div>
    </>
  );
}
