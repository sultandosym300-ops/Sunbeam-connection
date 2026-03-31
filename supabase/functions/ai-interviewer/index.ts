import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not set");

    const systemPrompt = `Ты — AI-ассистент для создания волонтёрских задач на платформе Sunbeam Connect в Казахстане.
Твоя цель — через диалог собрать ВСЮ необходимую информацию для задачи:
1. Название задачи (кратко и понятно)
2. Подробное описание (что нужно делать, сколько людей нужно, условия работы)
3. Локация (город в Казахстане)
4. Дата проведения (конкретная дата)
5. Время суток (Утро / День / Вечер)
6. Необходимые навыки из списка: Медицина, ИТ, Образование, Животные, Дети, Экология, Спорт, Кулинария, Транспорт, Строительство, Психология, Юриспруденция, Дизайн, Маркетинг, Переводы

Правила:
- Задавай по 1-2 вопроса за раз
- Будь дружелюбным и кратким
- Если пользователь даёт неполный ответ, уточняй
- Когда ВСЯ информация собрана, вызови функцию create_task
- НЕ вызывай функцию пока не уточнишь все 6 пунктов`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        tools: [{
          type: "function",
          function: {
            name: "create_task",
            description: "Создать волонтёрскую задачу после сбора всей информации",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string", description: "Название задачи" },
                description: { type: "string", description: "Подробное описание задачи" },
                location: { type: "string", description: "Город в Казахстане" },
                date: { type: "string", description: "Дата в формате YYYY-MM-DD" },
                time_slot: { type: "string", enum: ["Утро", "День", "Вечер"], description: "Время суток" },
                required_skills: { type: "array", items: { type: "string" }, description: "Навыки" },
              },
              required: ["title", "description", "location", "date", "time_slot", "required_skills"],
            },
          },
        }],
      }),
    });

    if (!response.ok) {
      const s = response.status;
      if (s === 429) return new Response(JSON.stringify({ error: "Слишком много запросов, попробуйте позже" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (s === 402) return new Response(JSON.stringify({ error: "Требуется пополнение баланса" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await response.text();
      console.error("AI gateway error:", s, t);
      throw new Error(`AI error: ${s}`);
    }

    const data = await response.json();
    return new Response(JSON.stringify(data), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("ai-interviewer error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
