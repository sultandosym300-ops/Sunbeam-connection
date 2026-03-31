import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { task, applications } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not set");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get history for each volunteer
    const volunteerIds = applications.map((a: any) => a.volunteer_id);
    const { data: allApps } = await supabase
      .from("task_applications")
      .select("volunteer_id, status, created_at")
      .in("volunteer_id", volunteerIds);

    const history: Record<string, { total: number; completed: number; cancelled: number }> = {};
    (allApps || []).forEach((a: any) => {
      if (!history[a.volunteer_id]) history[a.volunteer_id] = { total: 0, completed: 0, cancelled: 0 };
      history[a.volunteer_id].total++;
      if (a.status === "approved" || a.status === "completed") history[a.volunteer_id].completed++;
      if (a.status === "cancelled" || a.status === "rejected") history[a.volunteer_id].cancelled++;
    });

    const context = applications.map((a: any) => ({
      volunteer_id: a.volunteer_id,
      volunteer_name: a.volunteer?.full_name || "Unknown",
      reputation: a.volunteer?.reputation_points || 0,
      history: history[a.volunteer_id] || { total: 0, completed: 0, cancelled: 0 },
    }));

    const prompt = `Ты — AI-аналитик платформы Sunbeam Connect.
Задача: "${task.title}" в ${task.location || "неизвестно"}, дата: ${task.date || "не указана"}, время: ${task.time_slot || "не указано"}.

Волонтёры: ${JSON.stringify(context)}

Для каждого волонтёра оцени вероятность явки (0-100%) и дай краткую пометку.
Учитывай: историю (процент завершённых), репутацию, время ивента.`;

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
            name: "attendance_prediction",
            description: "Прогноз явки волонтёров",
            parameters: {
              type: "object",
              properties: {
                predictions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      volunteer_id: { type: "string" },
                      probability: { type: "number", description: "0-100" },
                      note: { type: "string", description: "Краткая пометка" },
                    },
                    required: ["volunteer_id", "probability", "note"],
                  },
                },
                overall_probability: { type: "number", description: "Средняя вероятность явки 0-100" },
              },
              required: ["predictions", "overall_probability"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "attendance_prediction" } },
      }),
    });

    if (!response.ok) {
      const s = response.status;
      if (s === 429) return new Response(JSON.stringify({ error: "Rate limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (s === 402) return new Response(JSON.stringify({ error: "Payment required" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI error: ${s}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.name === "attendance_prediction") {
      const result = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ predictions: [], overall_probability: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("attendance-predictor error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
