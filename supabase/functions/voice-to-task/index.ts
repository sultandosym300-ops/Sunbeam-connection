import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { transcript } = await req.json();
    if (!transcript?.trim()) throw new Error("Empty transcript");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not set");

    const prompt = `Извлеки из этой речи информацию для создания волонтёрской задачи в Казахстане.
Речь: "${transcript}"

Извлеки: название, описание, дату (YYYY-MM-DD), локацию, время суток (Утро/День/Вечер), количество людей и ключевые навыки из списка:
Медицина, ИТ, Образование, Животные, Дети, Экология, Спорт, Кулинария, Транспорт, Строительство, Психология, Юриспруденция, Дизайн, Маркетинг, Переводы.

Если какие-то данные не указаны, придумай разумные значения на основе контекста.`;

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
            name: "extract_task",
            description: "Извлечённые данные задачи из голосовой записи",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string" },
                description: { type: "string" },
                location: { type: "string" },
                date: { type: "string", description: "YYYY-MM-DD" },
                time_slot: { type: "string", enum: ["Утро", "День", "Вечер"] },
                required_skills: { type: "array", items: { type: "string" } },
              },
              required: ["title", "description", "location", "date", "time_slot", "required_skills"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "extract_task" } },
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
    if (toolCall?.function?.name === "extract_task") {
      const task = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify({ task }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Failed to extract task" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("voice-to-task error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
