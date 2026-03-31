import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { X, Send, Bot, User, MapPin, Calendar, Clock, Loader2, Users, Sparkles, CheckCircle, XCircle, Star, ThumbsUp, ThumbsDown, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import PhotoReport from "./PhotoReport";
import VolunteerProfilePopup from "./VolunteerProfilePopup";

interface TaskDetailDialogProps {
  task: any;
  onClose: () => void;
  matchInfo?: { score: number; explanation: string };
}

const TaskDetailDialog = ({ task, onClose, matchInfo }: TaskDetailDialogProps) => {
  const { user, profile } = useAuth();
  const isVolunteer = profile?.role === "volunteer";
  const isOwner = task.organization_id === user?.id;

  const [chatMessages, setChatMessages] = useState<{ role: string; content: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [application, setApplication] = useState<any>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [applying, setApplying] = useState(false);
  const [selectedVolunteer, setSelectedVolunteer] = useState<any>(null);
  const [attendancePredictions, setAttendancePredictions] = useState<Record<string, { probability: number; note: string }>>({});
  const [overallProbability, setOverallProbability] = useState<number | null>(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [updatingApp, setUpdatingApp] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      if (isVolunteer) loadApplication();
      if (isOwner) loadApplications();
    }
  }, [user]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const loadApplication = async () => {
    if (!user) return;
    const { data } = await supabase.from("task_applications")
      .select("*")
      .eq("task_id", task.id)
      .eq("volunteer_id", user.id)
      .maybeSingle();
    setApplication(data);
  };

  const loadApplications = async () => {
    const { data } = await supabase.from("task_applications")
      .select("*")
      .eq("task_id", task.id)
      .order("created_at", { ascending: false });

    if (data?.length) {
      const volunteerIds = data.map((a: any) => a.volunteer_id);
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name, skills, bio, reputation_points, age, experience, availability")
        .in("id", volunteerIds);
      const profileMap = new Map(profs?.map(p => [p.id, p]) || []);
      setApplications(data.map((a: any) => ({ ...a, volunteer: profileMap.get(a.volunteer_id) })));
    } else {
      setApplications([]);
    }
  };

  const handleApply = async () => {
    if (!user) return;
    setApplying(true);
    const { error } = await supabase.from("task_applications").insert({
      task_id: task.id,
      volunteer_id: user.id,
      match_score: matchInfo?.score || null,
      match_explanation: matchInfo?.explanation || null,
    });
    if (error) {
      toast.error("Ошибка при отклике");
    } else {
      toast.success("Вы откликнулись на задачу!");
      await supabase.from("notifications").insert({
        user_id: task.organization_id,
        title: "Новый отклик на задачу!",
        body: `${profile?.full_name || "Волонтёр"} откликнулся на "${task.title}"${matchInfo?.score ? ` (совпадение ${Math.round(matchInfo.score)}%)` : ""}`,
        type: "application",
        task_id: task.id,
      });
      loadApplication();
    }
    setApplying(false);
  };

  const handleUpdateApplication = async (appId: string, volunteerId: string, status: "accepted" | "rejected") => {
    setUpdatingApp(appId);
    const { error } = await supabase.from("task_applications")
      .update({ status })
      .eq("id", appId);
    if (error) {
      toast.error("Ошибка обновления");
      console.error(error);
    } else {
      toast.success(status === "accepted" ? "Волонтёр принят!" : "Отклик отклонён");
      // Notify volunteer
      await supabase.from("notifications").insert({
        user_id: volunteerId,
        title: status === "accepted" ? "Ваш отклик принят! 🎉" : "Отклик отклонён",
        body: status === "accepted"
          ? `Вас приняли на задачу "${task.title}". Ждём вас!`
          : `К сожалению, ваш отклик на "${task.title}" был отклонён.`,
        type: status === "accepted" ? "approved" : "rejected",
        task_id: task.id,
      });
      // Update reputation for accepted
      if (status === "accepted") {
        const app = applications.find(a => a.id === appId);
        if (app?.volunteer?.reputation_points !== undefined) {
          await supabase.from("profiles")
            .update({ reputation_points: (app.volunteer.reputation_points || 0) + 5 })
            .eq("id", volunteerId);
        }
      }
      loadApplications();
    }
    setUpdatingApp(null);
  };

  const loadAttendancePredictions = async () => {
    if (applications.length === 0) return;
    setAttendanceLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("attendance-predictor", {
        body: { task, applications },
      });
      if (error) throw error;
      if (data?.predictions) {
        const map: Record<string, { probability: number; note: string }> = {};
        data.predictions.forEach((p: any) => { map[p.volunteer_id] = { probability: p.probability, note: p.note }; });
        setAttendancePredictions(map);
        setOverallProbability(data.overall_probability ?? null);
      }
    } catch (e: any) {
      console.error("Attendance prediction error:", e);
      toast.error("Ошибка прогноза явки");
    }
    setAttendanceLoading(false);
  };

  const handleChatSend = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const question = chatInput;
    setChatMessages(prev => [...prev, { role: "user", content: question }]);
    setChatInput("");
    setChatLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("rag-consultant", {
        body: { task_title: task.title, task_description: task.description, question },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setChatMessages(prev => [...prev, { role: "assistant", content: data.answer }]);
    } catch (e: any) {
      toast.error("Ошибка AI");
      console.error("RAG error:", e);
    }
    setChatLoading(false);
  };

  const getProbColor = (prob: number) => {
    if (prob >= 80) return "text-green-400";
    if (prob >= 50) return "text-yellow-400";
    return "text-red-400";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card gradient-border w-full max-w-2xl max-h-[90vh] flex flex-col"
      >
        <div className="flex items-center justify-between p-6 border-b border-border/30">
          <h2 className="text-xl font-bold text-foreground pr-4 line-clamp-1">{task.title}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {matchInfo && matchInfo.score > 0 && (
          <div className="mx-6 mt-4 p-4 rounded-lg bg-primary/10 border border-primary/20">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-bold text-primary">Почему мы рекомендуем это вам</span>
              <span className="ml-auto text-xs font-bold text-primary bg-primary/20 px-2 py-0.5 rounded-full">
                {Math.round(matchInfo.score)}%
              </span>
            </div>
            <p className="text-sm text-foreground/80">{matchInfo.explanation}</p>
          </div>
        )}

        <Tabs defaultValue="details" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="mx-6 mt-4 bg-secondary/50">
            <TabsTrigger value="details">Детали</TabsTrigger>
            {isVolunteer && <TabsTrigger value="chat">🤖 Спросить бота</TabsTrigger>}
            {isOwner && <TabsTrigger value="applications">Отклики ({applications.length})</TabsTrigger>}
          </TabsList>

          <TabsContent value="details" className="flex-1 overflow-y-auto p-6 space-y-4">
            <p className="text-sm text-foreground whitespace-pre-wrap">{task.description}</p>
            <div className="space-y-2">
              {task.location && <div className="flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="w-4 h-4" /> {task.location}</div>}
              {task.date && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Calendar className="w-4 h-4" /> {new Date(task.date).toLocaleDateString("ru-KZ")}</div>}
              {task.time_slot && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Clock className="w-4 h-4" /> {task.time_slot}</div>}
            </div>
            {task.required_skills?.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {task.required_skills.map((skill: string) => (
                  <span key={skill} className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">{skill}</span>
                ))}
              </div>
            )}
            {task.profiles?.full_name && <p className="text-sm text-muted-foreground">Организация: {task.profiles.full_name}</p>}
            {isVolunteer && !isOwner && (
              <div className="pt-4 border-t border-border/30">
                {!application ? (
                  <Button onClick={handleApply} disabled={applying} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                    {applying && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    Откликнуться на задачу
                  </Button>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm text-green-400">
                      <CheckCircle className="w-4 h-4" />
                      Вы откликнулись на эту задачу
                      {application.status === "accepted" && <span className="ml-2 px-2 py-0.5 rounded-full bg-green-400/10 text-xs font-bold">Принят!</span>}
                      {application.status === "rejected" && <span className="ml-2 px-2 py-0.5 rounded-full bg-red-400/10 text-xs font-bold text-red-400">Отклонён</span>}
                    </div>
                    <PhotoReport task={task} application={application} onUpdate={loadApplication} />
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {isVolunteer && (
            <TabsContent value="chat" className="flex-1 flex flex-col overflow-hidden p-0">
              <div className="flex-1 overflow-y-auto p-6 space-y-3">
                {chatMessages.length === 0 && (
                  <div className="text-center py-8">
                    <Bot className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Задайте вопрос о задаче.<br />Бот ответит строго на основе описания.</p>
                    <div className="flex flex-wrap gap-2 justify-center mt-4">
                      {["Нужно ли брать перчатки?", "Сколько людей нужно?", "Какие условия работы?"].map(q => (
                        <button key={q} onClick={() => setChatInput(q)} className="px-3 py-1.5 rounded-full text-xs bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary transition-all">{q}</button>
                      ))}
                    </div>
                  </div>
                )}
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${msg.role === "user" ? "bg-primary/20" : "bg-secondary"}`}>
                      {msg.role === "user" ? <User className="w-3.5 h-3.5 text-primary" /> : <Bot className="w-3.5 h-3.5 text-muted-foreground" />}
                    </div>
                    <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary/50 text-foreground"}`}>{msg.content}</div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex gap-2">
                    <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center"><Bot className="w-3.5 h-3.5 text-muted-foreground" /></div>
                    <div className="bg-secondary/50 rounded-2xl px-3 py-2"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
              <div className="p-4 border-t border-border/30 flex gap-2">
                <Input value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleChatSend()} placeholder="Спросите о задаче..." className="bg-secondary/50 border-border/50" disabled={chatLoading} />
                <Button onClick={handleChatSend} disabled={chatLoading || !chatInput.trim()} size="icon" className="bg-primary hover:bg-primary/90 text-primary-foreground shrink-0"><Send className="w-4 h-4" /></Button>
              </div>
            </TabsContent>
          )}

          {isOwner && (
            <TabsContent value="applications" className="flex-1 overflow-y-auto p-6 space-y-3">
              {/* Attendance predictor */}
              {applications.length > 0 && (
                <div className="flex items-center justify-between mb-2">
                  {overallProbability !== null && (
                    <div className={`flex items-center gap-2 text-sm font-medium ${getProbColor(overallProbability)}`}>
                      <Activity className="w-4 h-4" />
                      Общий прогноз явки: {overallProbability}%
                    </div>
                  )}
                  <Button size="sm" variant="outline" onClick={loadAttendancePredictions} disabled={attendanceLoading} className="border-border/50 ml-auto">
                    {attendanceLoading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Activity className="w-3 h-3 mr-1" />}
                    Прогноз явки
                  </Button>
                </div>
              )}

              {overallProbability !== null && overallProbability < 80 && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center justify-between">
                  <span className="text-sm text-destructive">⚠️ Риск неявки! Рекомендуем срочный добор.</span>
                  <Button size="sm" className="bg-destructive hover:bg-destructive/90 text-destructive-foreground text-xs">
                    🚀 Срочный добор
                  </Button>
                </div>
              )}

              {applications.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Пока нет откликов на эту задачу</p>
                </div>
              ) : (
                applications.map((app) => {
                  const pred = attendancePredictions[app.volunteer_id];
                  return (
                    <div key={app.id} className="glass-card p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <button onClick={() => setSelectedVolunteer(app.volunteer)} className="font-medium text-foreground hover:text-primary transition-colors underline decoration-dashed underline-offset-2 cursor-pointer">
                            {app.volunteer?.full_name || "Волонтёр"}
                          </button>
                          {(app.volunteer as any)?.reputation_points > 0 && (
                            <div className="flex items-center gap-0.5 text-yellow-400">
                              <Star className="w-3 h-3" />
                              <span className="text-xs font-bold">{(app.volunteer as any).reputation_points}</span>
                            </div>
                          )}
                          {pred && (
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${pred.probability >= 80 ? "bg-green-400/10 text-green-400" : pred.probability >= 50 ? "bg-yellow-400/10 text-yellow-400" : "bg-red-400/10 text-red-400"}`}>
                              {pred.probability}% явка
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {app.match_score != null && (
                            <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">{Math.round(app.match_score)}% match</span>
                          )}
                          {app.status === "pending" && (
                            <>
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-green-400 hover:bg-green-400/10" disabled={updatingApp === app.id} onClick={() => handleUpdateApplication(app.id, app.volunteer_id, "accepted")}>
                                {updatingApp === app.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <ThumbsUp className="w-3.5 h-3.5" />}
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-red-400 hover:bg-red-400/10" disabled={updatingApp === app.id} onClick={() => handleUpdateApplication(app.id, app.volunteer_id, "rejected")}>
                                <ThumbsDown className="w-3.5 h-3.5" />
                              </Button>
                            </>
                          )}
                          {app.status === "accepted" && <span className="text-xs font-bold text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full">Принят</span>}
                          {app.status === "rejected" && <span className="text-xs font-bold text-red-400 bg-red-400/10 px-2 py-0.5 rounded-full">Отклонён</span>}
                        </div>
                      </div>
                      {pred?.note && <p className="text-xs text-muted-foreground italic">📊 {pred.note}</p>}
                      {app.volunteer?.skills?.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {app.volunteer.skills.map((s: string) => (
                            <span key={s} className="px-2 py-0.5 rounded-full text-xs bg-secondary text-muted-foreground">{s}</span>
                          ))}
                        </div>
                      )}
                      {app.match_explanation && <p className="text-xs text-muted-foreground italic">💡 {app.match_explanation}</p>}
                      {app.photo_url && (
                        <div className="space-y-1 pt-2 border-t border-border/20">
                          <img src={app.photo_url} alt="Фото-отчёт" className="rounded-lg max-h-40 object-cover" />
                          {app.ai_verdict && (
                            <div className={`flex items-center gap-1 text-xs font-medium ${app.ai_verdict === "approved" ? "text-green-400" : "text-red-400"}`}>
                              {app.ai_verdict === "approved" ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                              {app.ai_verdict === "approved" ? "Одобрено AI" : "Отклонено AI"}
                            </div>
                          )}
                          {app.ai_comment && <p className="text-xs text-muted-foreground">{app.ai_comment}</p>}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </TabsContent>
          )}
        </Tabs>
      </motion.div>

      <VolunteerProfilePopup
        volunteer={selectedVolunteer}
        open={!!selectedVolunteer}
        onClose={() => setSelectedVolunteer(null)}
      />
    </div>
  );
};

export default TaskDetailDialog;
