import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Copy, Loader2, Wand2 } from "lucide-react";
import { generateEmail } from "@/lib/ai.functions";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export const Route = createFileRoute("/_workspace/email")({
  head: () => ({
    meta: [
      { title: "Smart Email Writer — Tempo" },
      { name: "description", content: "Generate, rewrite, shorten and improve emails in any tone." },
      { property: "og:title", content: "Smart Email Writer — Tempo" },
      { property: "og:description", content: "AI-powered professional email writing." },
    ],
  }),
  component: EmailPage,
});

type Mode = "generate" | "rewrite" | "shorten" | "improve";
type Tone = "professional" | "friendly" | "formal" | "persuasive" | "apologetic" | "concise";
const modes: { v: Mode; l: string; ph: string }[] = [
  { v: "generate", l: "Generate", ph: "Describe the email: who it's for, the purpose, and key details…" },
  { v: "rewrite", l: "Rewrite", ph: "Paste the email you want rewritten…" },
  { v: "shorten", l: "Shorten", ph: "Paste a long email to trim down…" },
  { v: "improve", l: "Improve", ph: "Paste an email to polish its clarity and grammar…" },
];
const tones: Tone[] = ["professional", "friendly", "formal", "persuasive", "apologetic", "concise"];

function EmailPage() {
  const qc = useQueryClient();
  const [mode, setMode] = useState<Mode>("generate");
  const [tone, setTone] = useState<Tone>("professional");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const run = useServerFn(generateEmail);

  const history = useQuery({
    queryKey: ["emails"],
    queryFn: async () => {
      const { data, error } = await supabase.from("emails").select("*").order("created_at", { ascending: false }).limit(8);
      if (error) throw error;
      return data;
    },
  });

  const m = useMutation({
    mutationFn: () => run({ data: { mode, tone, input } }),
    onSuccess: (r) => {
      setOutput(r.output);
      qc.invalidateQueries({ queryKey: ["emails"] });
      qc.invalidateQueries({ queryKey: ["counts"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to generate"),
  });

  return (
    <>
      <PageHeader title="Smart email writer" subtitle="Missing details become [placeholders] — the AI never makes them up." />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card-soft space-y-4 p-6">
          <ToggleGroup type="single" value={mode} onValueChange={(v) => v && setMode(v as Mode)} className="flex-wrap justify-start">
            {modes.map((x) => (
              <ToggleGroupItem key={x.v} value={x.v} className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                {x.l}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <Select value={tone} onValueChange={(v) => setTone(v as Tone)}>
            <SelectTrigger className="w-48 capitalize"><SelectValue /></SelectTrigger>
            <SelectContent>
              {tones.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <Textarea rows={12} value={input} onChange={(e) => setInput(e.target.value)} placeholder={modes.find((x) => x.v === mode)!.ph} />
          <Button onClick={() => m.mutate()} disabled={m.isPending || input.trim().length < 3} className="w-full">
            {m.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Wand2 className="mr-2 size-4" />}
            {m.isPending ? "Writing…" : modes.find((x) => x.v === mode)!.l + " email"}
          </Button>
        </div>
        <div className="card-soft flex flex-col p-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl">Result</h2>
            <Button size="sm" variant="ghost" disabled={!output} onClick={() => { navigator.clipboard.writeText(output); toast.success("Copied"); }}>
              <Copy className="mr-1 size-4" /> Copy
            </Button>
          </div>
          {output ? (
            <Textarea value={output} onChange={(e) => setOutput(e.target.value)} className="min-h-80 flex-1 bg-muted/40" />
          ) : (
            <div className="grid flex-1 place-items-center rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              Your email will appear here.
            </div>
          )}
        </div>
      </div>

      {!!history.data?.length && (
        <section className="mt-8">
          <h2 className="mb-3 text-xl">Recent emails</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {history.data.map((h) => (
              <button key={h.id} onClick={() => setOutput(h.output)} className="card-soft p-4 text-left hover:shadow-lift">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{h.mode} · {h.tone} · {new Date(h.created_at).toLocaleDateString()}</p>
                <p className="mt-1 line-clamp-2 text-sm">{h.output}</p>
              </button>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
