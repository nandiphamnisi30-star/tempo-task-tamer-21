import { createFileRoute, Link } from "@tanstack/react-router";
import { Mail, NotebookPen, ListChecks, Sparkles, ShieldCheck, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tempo — Your AI productivity assistant" },
      { name: "description", content: "Write better emails, summarize meetings into action items, and plan your tasks with AI — all in one calm workspace." },
      { property: "og:title", content: "Tempo — Your AI productivity assistant" },
      { property: "og:description", content: "Emails, meeting summaries and task planning powered by AI, in one place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: Mail, title: "Smart email writer", body: "Draft, rewrite, shorten or polish emails in the tone you need." },
  { icon: NotebookPen, title: "Meeting summarizer", body: "Turn raw notes into key points, decisions and action items with owners." },
  { icon: ListChecks, title: "AI task planner", body: "Dump your to-dos and get a prioritized, scheduled plan you can track." },
];

function Landing() {
  return (
    <div className="paper-grain min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Sparkles className="size-5" />
          </span>
          <span className="font-display text-xl">Tempo</span>
        </div>
        <Button asChild variant="ghost">
          <Link to="/auth">Sign in</Link>
        </Button>
      </header>

      <section className="mx-auto max-w-6xl px-6 pb-20 pt-16 md:pt-24">
        <p className="mb-5 inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-semibold uppercase tracking-wider text-secondary-foreground">
          For students, teams & professionals
        </p>
        <h1 className="max-w-3xl text-5xl leading-[1.05] text-foreground md:text-7xl">
          Less busywork.<br />
          <span className="text-primary">More real work.</span>
        </h1>
        <p className="mt-6 max-w-xl text-lg text-muted-foreground">
          Tempo writes your emails, distills your meetings and plans your day — so you can focus on what matters.
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          <Button asChild size="lg" className="rounded-full px-7">
            <Link to="/auth">
              Get started free <ArrowRight className="ml-1 size-4" />
            </Link>
          </Button>
        </div>

        <div className="mt-20 grid gap-5 md:grid-cols-3">
          {features.map(({ icon: Icon, title, body }) => (
            <div key={title} className="card-soft p-6">
              <span className="mb-4 grid size-11 place-items-center rounded-xl bg-accent text-accent-foreground">
                <Icon className="size-5" />
              </span>
              <h3 className="text-xl">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>

        <p className="mt-12 flex items-center gap-2 text-sm text-muted-foreground">
          <ShieldCheck className="size-4 text-primary" /> Your data is private to your account and never shared.
        </p>
      </section>
    </div>
  );
}
