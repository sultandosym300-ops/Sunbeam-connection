import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Send, Loader2, Bot, User, CheckCircle, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const withTimeout = async <T,>(promise: PromiseLike<T>, label: string, timeoutMs = 8000): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`${label} превысил лимит ожидания`)), timeoutMs);
    }),
  ]);
};

const VolunteerProfile = ({ profile: _profile, onUpdate }: { profile: any; onUpdate: () => void | Promise<void> }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Привет! 👋 Я помогу заполнить ваш профиль волонтёра. Расскажите немного о себе — сколько вам лет и чем вы занимаетесь?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendToAI = async (allMessages: Message[]) => {
    setLoading(true);
    try {
      console.log("VolunteerProfile: sending message to AI");

      const { data, error } = await withTimeout(
        supabase.functions.invoke("profile-interviewer", {
          body: { messages: allMessages },
        }),
        "AI-интервью"
      );

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const choice = data.choices?.[0]?.message;
      if (!choice) throw new Error("Нет ответа от AI");

      if (choice.tool_calls?.length > 0) {
        const toolCall = choice.tool_calls[0];
        if (toolCall.function.name === "save_profile") {
          const profileData = JSON.parse(toolCall.function.arguments);
          await saveProfile(profileData);
          setMessages(prev => [...prev, {
            role: "assistant",
            content: `✅ Отлично, ваш профиль готов!\n\n🧠 Навыки: ${profileData.skills.join(", ")}\n📝 О вас: ${profileData.bio}\n🎂 Возраст: ${profileData.age}\n💼 Опыт: ${profileData.experience}\n\nТеперь система будет подбирать задачи специально для вас!`
          }]);
          setProfileSaved(true);
        }
      } else if (choice.content) {
        setMessages(prev => [...prev, { role: "assistant", content: choice.content }]);
      }
    } catch (e: any) {
      console.error("Profile interviewer error:", e);
      toast.error(e.message || "Ошибка AI");
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Не удалось получить ответ AI. Попробуйте ещё раз коротким сообщением — интерфейс продолжит работать."
      }]);
    } finally {

      setLoading(false);

    }
  };

  const saveProfile = async (profileData: { skills: string[]; bio: string; age: number; experience: string; availability: Record<string, string[]> }) => {
    if (!user) return;
    console.log("VolunteerProfile: saving profile");
    const { error } = await withTimeout(
      supabase
        .from("profiles")
        .update({
          skills: profileData.skills,
          bio: profileData.bio,
          age: profileData.age,
          experience: profileData.experience,
          availability: profileData.availability,
        } as any)
        .eq("id", user.id),
      "Сохранение профиля"
    );

    if (error) {
      console.error("Profile save error:", error);
      toast.error("Ошибка сохранения профиля");
      throw error;
    }
    toast.success("Профиль сохранён!");
    await onUpdate();
  };

  const handleSend = async () => {
    if (!input.trim() || loading || profileSaved) return;
    const userMsg: Message = { role: "user", content: input };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    await sendToAI(newMessages);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card gradient-border overflow-hidden"
    >
      <div className="flex items-center gap-3 p-6 border-b border-border/30">
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
          <MessageSquare className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">AI-Интервью</h2>
          <p className="text-sm text-muted-foreground">Расскажите о себе, а AI заполнит профиль</p>
        </div>
      </div>

      <div className="h-80 overflow-y-auto p-6 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              msg.role === "user" ? "bg-primary/20" : "bg-secondary"
            }`}>
              {msg.role === "user" ? <User className="w-4 h-4 text-primary" /> : <Bot className="w-4 h-4 text-muted-foreground" />}
            </div>
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
              msg.role === "user"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary/50 text-foreground"
            }`}>
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
              <Bot className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="bg-secondary/50 rounded-2xl px-4 py-3">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-border/30">
        {profileSaved ? (
          <div className="flex items-center justify-center gap-2 text-sm text-primary font-medium py-2">
            <CheckCircle className="w-4 h-4" />
            Профиль заполнен! Задачи уже подбираются.
          </div>
        ) : (
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Расскажите о себе..."
              className="bg-secondary/50 border-border/50"
              disabled={loading}
            />
            <Button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              size="icon"
              className="bg-primary hover:bg-primary/90 text-primary-foreground shrink-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default VolunteerProfile;
