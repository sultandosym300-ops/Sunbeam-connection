import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { volunteer, tasks } = await req.json();
    if (!volunteer || !tasks?.length) {
      return new Response(JSON.stringify({ matches: [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not set");

    const tasksDescription = tasks.map((t: any, i: number) =>
      `${i + 1}. [ID: ${t.id}] "${t.title}" — ${t.description}. Навыки: ${t.required_skills?.join(", ") || "не указаны"}. Локация: ${t.location || "не указана"}. Время: ${t.time_slot || "не указано"}.`
    ).join("\n");

    const prompt = `Ты — система семантического подбора волонтёров. Проанализируй совместимость волонтёра с каждой задачей по СМЫСЛУ, а не просто по ключевым словам.

ПРОФИЛЬ ВОЛОНТЁРА:
- Имя: ${volunteer.full_name || "Не указано"}
- Навыки: ${volunteer.skills?.join(", ") || "не указаны"}
- Био: ${volunteer.bio || "не указано"}
- Доступность: ${JSON.stringify(volunteer.availability || {})}

ЗАДАЧИ:
${tasksDescription}

Для каждой задачи:
1. Оцени совместимость от 0 до 100 на основе:
   - Совпадение навыков (прямое и косвенное/смысловое)
   - Релевантность опыта из био
   - Совпадение по времени и локации
2. Напиши краткую аргументацию (1-2 предложения) ПОЧЕМУ этот волонтёр подходит или не подходит
3. Учитывай смысловые связи (например, "медицина" связана с "первая помощь", "ИТ" с "автоматизация")`;

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
            name: "return_matches",
            description: "Вернуть результаты семантического подбора",
            parameters: {
              type: "object",
              properties: {
                matches: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      task_id: { type: "string", description: "UUID задачи" },
                      score: { type: "number", description: "Совместимость 0-100" },
                      explanation: { type: "string", description: "Аргументация подбора" },
                    },
                    required: ["task_id", "score", "explanation"],
                  },
                },
              },
              required: ["matches"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "return_matches" } },
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
    if (toolCall) {
      const result = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ matches: [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("match-volunteers error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
