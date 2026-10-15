import { Link, Outlet, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, Mail, NotebookPen, ListChecks, LogOut, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/email", label: "Email writer", icon: Mail },
  { to: "/meetings", label: "Meeting notes", icon: NotebookPen },
  { to: "/tasks", label: "Task planner", icon: ListChecks },
] as const;

export function AppShell() {
  const navigate = useNavigate();
  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };
  return (
    <div className="min-h-screen md:flex">
      <aside className="flex items-center justify-between gap-2 bg-sidebar px-4 py-3 text-sidebar-foreground md:sticky md:top-0 md:h-screen md:w-64 md:flex-col md:items-stretch md:justify-start md:px-5 md:py-8">
        <Link to="/dashboard" className="flex items-center gap-2 md:mb-10">
          <span className="grid size-9 place-items-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
            <Sparkles className="size-5" />
          </span>
          <span className="font-display text-xl">Tempo</span>
        </Link>
        <nav className="flex gap-1 md:flex-col">
          {nav.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              activeProps={{ className: cn("bg-sidebar-accent text-sidebar-accent-foreground") }}
              title={label}
            >
              <Icon className="size-4 shrink-0" />
              <span className="hidden md:inline">{label}</span>
            </Link>
          ))}
        </nav>
        <button
          onClick={signOut}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent md:mt-auto"
          title="Sign out"
        >
          <LogOut className="size-4" />
          <span className="hidden md:inline">Sign out</span>
        </button>
      </aside>
      <main className="paper-grain min-w-0 flex-1 px-4 py-8 md:px-10 md:py-10">
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl text-foreground md:text-4xl">{title}</h1>
        {subtitle && <p className="mt-2 max-w-xl text-muted-foreground">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
