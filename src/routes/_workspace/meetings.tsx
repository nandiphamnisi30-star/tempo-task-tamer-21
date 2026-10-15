import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Sparkles, Plus, CheckCircle2 } from "lucide-react";
import { summarizeMeeting, type MeetingSummary } from "@/lib/ai.functions";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_workspace/meetings")({
  head: () => ({
    meta: [
      { title: "Meeting Notes Summarizer — Tempo" },
      { name: "description", content: "Summarize meeting notes into key points, decisions and action items." },
      { property: "og:title", content: "Meeting Notes Summarizer — Tempo" },
      { property: "og:description", content: "Turn meeting notes into clear action items." },
    ],
  }),
  component: MeetingsPage,
});

const ISO = /^\d{4}-\d{2}-\d{2}$/;

function MeetingsPage() {
  const qc = useQueryClient();
  const [notes, setNotes] = useState("");
  const [summary, setSummary] = useState<MeetingSummary | null>(null);
  const [added, setAdded] = useState<Set<number>>(new Set());
  const run = useServerFn(summarizeMeeting);

  const history = useQuery({
    queryKey: ["meetings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("meeting_summaries").select("*").order("created_at", { ascending: false }).limit(8);
      if (error) throw error;
      return data;
    },
  });

  const m = useMutation({
    mutationFn: () => run({ data: { notes } }),
    onSuccess: (r) => {
      setSummary(r.summary);
      setAdded(new Set());
      qc.invalidateQueries({ queryKey: ["meetings"] });
      qc.invalidateQueries({ queryKey: ["counts"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to summarize"),
  });

  const addTask = async (i: number) => {
    const a = summary?.action_items[i];
    if (!a || !summary) return;
    const { error } = await supabase.from("tasks").insert({
      title: a.task,
      description: [a.owner && `Owner: ${a.owner}`, a.deadline && `Deadline: ${a.deadline}`, `From: ${summary.title}`].filter(Boolean).join(" · "),
      due_date: a.deadline && ISO.test(a.deadline) ? a.deadline : null,
      source: "meeting",
    });
    if (error) { toast.error(error.message); return; }
    setAdded((s) => new Set(s).add(i));
    qc.invalidateQueries({ queryKey: ["tasks"] });
    toast.success("Added to your tasks");
  };

  return (
    <>
      <PageHeader title="Meeting notes summarizer" subtitle="Owners and deadlines are only filled in when they appear in your notes." />
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="card-soft space-y-4 p-6 lg:col-span-2">
          <Textarea rows={16} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Paste your raw meeting notes or transcript here…" />
          <Button className="w-full" onClick={() => m.mutate()} disabled={m.isPending || notes.trim().length < 20}>
            {m.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Sparkles className="mr-2 size-4" />}
            {m.isPending ? "Summarizing…" : "Summarize"}
          </Button>
          {notes.trim().length > 0 && notes.trim().length < 20 && <p className="text-xs text-muted-foreground">Add a bit more detail (20+ characters).</p>}
        </div>

        <div className="card-soft p-6 lg:col-span-3">
          {!summary ? (
            <div className="grid h-full min-h-60 place-items-center rounded-lg border border-dashed text-sm text-muted-foreground">
              Your summary will appear here.
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl">{summary.title}</h2>
                <p className="mt-2 text-muted-foreground">{summary.overview}</p>
              </div>
              <Block title="Key points" items={summary.key_points} />
              <Block title="Decisions" items={summary.decisions} />
              <div>
                <h3 className="mb-2 font-sans text-sm font-semibold uppercase tracking-wide text-primary">Action items</h3>
                {summary.action_items.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No action items found.</p>
                ) : (
                  <ul className="space-y-2">
                    {summary.action_items.map((a, i) => (
                      <li key={i} className="flex items-start justify-between gap-3 rounded-lg bg-muted/60 p-3">
                        <div>
                          <p className="font-medium">{a.task}</p>
                          <p className="text-xs text-muted-foreground">
                            Owner: {a.owner ?? "Not specified"} · Deadline: {a.deadline ?? "Not specified"}
                          </p>
                        </div>
                        <Button size="sm" variant="outline" disabled={added.has(i)} onClick={() => addTask(i)}>
                          {added.has(i) ? <CheckCircle2 className="size-4" /> : <><Plus className="mr-1 size-4" />Task</>}
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {!!history.data?.length && (
        <section className="mt-8">
          <h2 className="mb-3 text-xl">Past summaries</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {history.data.map((h) => (
              <button key={h.id} onClick={() => { setSummary(h.summary as unknown as MeetingSummary); setAdded(new Set()); }} className="card-soft p-4 text-left hover:shadow-lift">
                <p className="font-medium">{h.title}</p>
                <p className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleString()}</p>
              </button>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

function Block({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="mb-2 font-sans text-sm font-semibold uppercase tracking-wide text-primary">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">None recorded.</p>
      ) : (
        <ul className="list-disc space-y-1 pl-5">{items.map((x, i) => <li key={i}>{x}</li>)}</ul>
      )}
    </div>
  );
}
