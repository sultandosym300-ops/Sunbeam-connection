import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { X, Send, Loader2, Bot, User, CheckCircle, Mic, MicOff, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AITaskCreatorProps {
  onClose: () => void;
  onCreated: () => void;
}

const AITaskCreator = ({ onClose, onCreated }: AITaskCreatorProps) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Привет! 👋 Я помогу вам создать задачу для волонтёров. Расскажите, что нужно сделать? Начните с краткого описания.\n\n🎤 Также вы можете нажать на микрофон и продиктовать задачу голосом!" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [taskCreated, setTaskCreated] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceProcessing, setVoiceProcessing] = useState(false);
  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const startVoiceRecording = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Ваш браузер не поддерживает распознавание речи. Используйте Chrome.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "ru-RU";
    recognition.continuous = true;
    recognition.interimResults = false;

    let transcript = "";

    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          transcript += event.results[i][0].transcript + " ";
        }
      }
    };

    recognition.onend = async () => {
      setIsRecording(false);
      if (transcript.trim()) {
        setVoiceProcessing(true);
        setMessages(prev => [...prev, { role: "user", content: `🎤 ${transcript.trim()}` }]);
        try {
          const { data, error } = await supabase.functions.invoke("voice-to-task", {
            body: { transcript: transcript.trim() },
          });
          if (error) throw error;
          if (data?.task) {
            await saveTask(data.task);
            setMessages(prev => [...prev, {
              role: "assistant",
              content: `✅ Задача создана из голоса!\n\n📋 ${data.task.title}\n📝 ${data.task.description}\n📍 ${data.task.location}\n📅 ${data.task.date}\n⏰ ${data.task.time_slot}\n🏷️ ${data.task.required_skills.join(", ")}`
            }]);
            setTaskCreated(true);
          } else {
            throw new Error(data?.error || "Не удалось извлечь задачу");
          }
        } catch (e: any) {
          toast.error(e.message || "Ошибка обработки голоса");
          setMessages(prev => [...prev, { role: "assistant", content: "Не удалось обработать голосовую запись. Попробуйте ещё раз или опишите задачу текстом." }]);
        }
        setVoiceProcessing(false);
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setIsRecording(false);
      toast.error("Ошибка распознавания речи");
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
    toast.info("Говорите... Нажмите ещё раз чтобы остановить.");
  };

  const stopVoiceRecording = () => {
    recognitionRef.current?.stop();
    setIsRecording(false);
  };

  const sendToAI = async (allMessages: Message[]) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-interviewer", {
        body: { messages: allMessages },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const choice = data.choices?.[0]?.message;
      if (!choice) throw new Error("Нет ответа от AI");
      if (choice.tool_calls?.length > 0) {
        const toolCall = choice.tool_calls[0];
        if (toolCall.function.name === "create_task") {
          const taskData = JSON.parse(toolCall.function.arguments);
          await saveTask(taskData);
          setMessages(prev => [...prev, {
            role: "assistant",
            content: `✅ Задача создана!\n\n📋 ${taskData.title}\n📝 ${taskData.description}\n📍 ${taskData.location}\n📅 ${taskData.date}\n⏰ ${taskData.time_slot}\n🏷️ ${taskData.required_skills.join(", ")}`
          }]);
          setTaskCreated(true);
        }
      } else if (choice.content) {
        setMessages(prev => [...prev, { role: "assistant", content: choice.content }]);
      }
    } catch (e: any) {
      toast.error(e.message || "Ошибка AI");
      console.error(e);
    }
    setLoading(false);
  };

  const saveTask = async (taskData: any) => {
    if (!user) return;
    const { error } = await supabase.from("tasks").insert({
      title: taskData.title,
      description: taskData.description,
      location: taskData.location,
      date: taskData.date,
      time_slot: taskData.time_slot,
      required_skills: taskData.required_skills,
      organization_id: user.id,
      status: "open",
    });
    if (error) {
      toast.error("Ошибка сохранения задачи");
      throw error;
    }
    toast.success("Задача сохранена в базу!");
    onCreated();
  };

  const handleSend = async () => {
    if (!input.trim() || loading || taskCreated) return;
    const userMsg: Message = { role: "user", content: input };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    await sendToAI(newMessages);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card gradient-border w-full max-w-lg max-h-[85vh] flex flex-col"
      >
        <div className="flex items-center justify-between p-6 border-b border-border/30">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <Bot className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-lg font-bold text-foreground">AI-Интервьюер</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === "user" ? "bg-primary/20" : "bg-secondary"}`}>
                {msg.role === "user" ? <User className="w-4 h-4 text-primary" /> : <Bot className="w-4 h-4 text-muted-foreground" />}
              </div>
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary/50 text-foreground"}`}>
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}
          {(loading || voiceProcessing) && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                <Bot className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="bg-secondary/50 rounded-2xl px-4 py-3 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{voiceProcessing ? "Обработка голоса..." : "Думаю..."}</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t border-border/30">
          {taskCreated ? (
            <Button onClick={onClose} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
              <CheckCircle className="w-4 h-4 mr-2" /> Готово
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                type="button"
                size="icon"
                variant={isRecording ? "destructive" : "outline"}
                onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
                disabled={loading || voiceProcessing}
                className={`shrink-0 ${isRecording ? "animate-pulse" : "border-border/50"}`}
              >
                {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </Button>
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Опишите вашу задачу..."
                className="bg-secondary/50 border-border/50"
                disabled={loading || isRecording || voiceProcessing}
              />
              <Button onClick={handleSend} disabled={loading || !input.trim() || isRecording || voiceProcessing} size="icon" className="bg-primary hover:bg-primary/90 text-primary-foreground shrink-0">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default AITaskCreator;
