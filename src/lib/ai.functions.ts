import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GUARD = `Never invent facts, names, dates, numbers, or commitments that are not in the user's input. If something is missing, use a clear placeholder in square brackets like [recipient name] or leave it null. Treat all input as confidential.`;

const emailInput = z.object({
  mode: z.enum(["generate", "rewrite", "shorten", "improve"]),
  tone: z.enum(["professional", "friendly", "formal", "persuasive", "apologetic", "concise"]),
  input: z.string().min(3).max(8000),
});

export const generateEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => emailInput.parse(d))
  .handler(async ({ data, context }) => {
    const { aiText } = await import("./ai.server");
    const task = {
      generate: "Write a complete professional email (subject line first as 'Subject: ...') based on the user's description.",
      rewrite: "Rewrite the user's email keeping its meaning, with a 'Subject: ...' line first if one is appropriate.",
      shorten: "Shorten the user's email to its essentials, keeping all key facts and requests.",
      improve: "Improve clarity, grammar, structure and flow of the user's email without changing facts.",
    }[data.mode];
    const output = await aiText(
      `You are an expert business writer. ${task} Use a ${data.tone} tone. Output only the email text, no commentary. ${GUARD}`,
      data.input,
    );
    const { data: row } = await context.supabase
      .from("emails")
      .insert({ user_id: context.userId, mode: data.mode, tone: data.tone, input: data.input, output })
      .select()
      .single();
    return { output, id: row?.id ?? null };
  });

const summarySchema = z.object({
  title: z.string(),
  overview: z.string(),
  key_points: z.array(z.string()),
  decisions: z.array(z.string()),
  action_items: z.array(
    z.object({ task: z.string(), owner: z.string().nullable(), deadline: z.string().nullable() }),
  ),
});
export type MeetingSummary = z.infer<typeof summarySchema>;

export const summarizeMeeting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ notes: z.string().min(20).max(30000) }).parse(d))
  .handler(async ({ data, context }) => {
    const { aiObject } = await import("./ai.server");
    const summary = await aiObject(
      summarySchema,
      `You summarize meeting notes. Produce a short title, a 2-3 sentence overview, key points, decisions made, and action items. For each action item set owner and deadline ONLY if explicitly stated in the notes, otherwise null. Deadlines: keep the wording from the notes (e.g. "Friday", "2026-11-03"). ${GUARD}`,
      data.notes,
    );
    const { data: row } = await context.supabase
      .from("meeting_summaries")
      .insert({ user_id: context.userId, title: summary.title, notes: data.notes, summary })
      .select()
      .single();
    return { summary, id: row?.id ?? null };
  });

const planSchema = z.object({
  tasks: z.array(
    z.object({
      title: z.string(),
      description: z.string().nullable(),
      priority: z.enum(["high", "medium", "low"]),
      due_date: z.string().nullable(),
      estimated_minutes: z.number().nullable(),
    }),
  ),
});
export type PlannedTask = z.infer<typeof planSchema>["tasks"][number];

export const planTasks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ input: z.string().min(3).max(8000), today: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const { aiObject } = await import("./ai.server");
    const result = await aiObject(
      planSchema,
      `You are a productivity planner. Today is ${data.today}. Break the user's goals or to-do dump into clear, actionable tasks. Prioritize by urgency and impact. Set due_date (YYYY-MM-DD) only when the user states or clearly implies a date relative to today; otherwise null. Estimate minutes realistically or null if unclear. Order tasks by priority then due date. ${GUARD}`,
      data.input,
    );
    return result;
  });
