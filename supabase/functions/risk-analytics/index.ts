import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { tasks } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not set");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get application counts per task
    const taskIds = tasks.map((t: any) => t.id);
    const { data: apps } = await supabase
      .from("task_applications")
      .select("task_id, status")
      .in("task_id", taskIds);

    const appCounts: Record<string, { total: number; approved: number }> = {};
    (apps || []).forEach((a: any) => {
      if (!appCounts[a.task_id]) appCounts[a.task_id] = { total: 0, approved: 0 };
      appCounts[a.task_id].total++;
      if (a.status === "approved") appCounts[a.task_id].approved++;
    });

    const tasksContext = tasks.map((t: any) => ({
      id: t.id,
      title: t.title,
      date: t.date,
      location: t.location,
      required_skills: t.required_skills,
      applications: appCounts[t.id]?.total || 0,
      approved: appCounts[t.id]?.approved || 0,
    }));

    const prompt = `Ты — AI-аналитик рисков платформы Sunbeam Connect.
Проанализируй задачи организации и для каждой дай оценку риска срыва.

Учитывай:
- Количество откликов (мало = высокий риск)
- Дата проведения (скоро = выше риск если мало людей)
- Сложность навыков (редкие навыки = выше риск)
- Сегодня: ${new Date().toISOString().split("T")[0]}

Задачи: ${JSON.stringify(tasksContext)}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [{ role: "user", content: prompt }],
        tools: [{
          type: "function",
          function: {
            name: "risk_report",
            description: "Отчёт по рискам задач",
            parameters: {
              type: "object",
              properties: {
                analyses: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      task_id: { type: "string" },
                      risk_percent: { type: "number", description: "0-100" },
                      risk_level: { type: "string", enum: ["low", "medium", "high", "critical"] },
                      recommendation: { type: "string", description: "Краткая рекомендация" },
                    },
                    required: ["task_id", "risk_percent", "risk_level", "recommendation"],
                  },
                },
              },
              required: ["analyses"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "risk_report" } },
      }),
    });

    if (!response.ok) {
      const s = response.status;
      if (s === 429) return new Response(JSON.stringify({ error: "Слишком много запросов" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (s === 402) return new Response(JSON.stringify({ error: "Требуется пополнение баланса" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI error: ${s}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.name === "risk_report") {
      const report = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify(report), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ analyses: [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("risk-analytics error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
