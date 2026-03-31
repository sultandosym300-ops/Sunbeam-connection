import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Sun, ArrowLeft, BarChart3, TrendingUp, MapPin, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts";

const COLORS = [
  "hsl(217, 91%, 60%)", "hsl(280, 70%, 60%)", "hsl(142, 70%, 45%)",
  "hsl(38, 92%, 50%)", "hsl(350, 80%, 55%)", "hsl(200, 80%, 50%)",
];

const AdminAnalytics = () => {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!user || profile?.role !== "organization")) {
      navigate("/dashboard");
    }
  }, [user, profile, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    setDataLoading(true);
    try {
      const [tasksRes, appsRes, profilesRes] = await Promise.all([
        supabase.from("tasks").select("*").eq("organization_id", user!.id),
        supabase.from("task_applications").select("*"),
        supabase.from("profiles").select("id, full_name, skills, reputation_points, availability").eq("role", "volunteer"),
      ]);
      setTasks(tasksRes.data || []);
      setApplications(appsRes.data || []);
      setProfiles(profilesRes.data || []);
    } catch (e) {
      console.error("Analytics load error:", e);
    }
    setDataLoading(false);
  };

  // Heatmap: activity by city
  const cityActivity: Record<string, number> = {};
  tasks.forEach((t) => {
    const city = t.location || "Не указано";
    cityActivity[city] = (cityActivity[city] || 0) + 1;
  });
  const cityData = Object.entries(cityActivity)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // Skill demand: unfulfilled tasks by skill
  const skillDemand: Record<string, number> = {};
  tasks.filter(t => t.status === "open").forEach((t) => {
    (t.required_skills || []).forEach((s: string) => {
      skillDemand[s] = (skillDemand[s] || 0) + 1;
    });
  });
  const skillData = Object.entries(skillDemand)
    .map(([name, demand]) => ({ name, demand }))
    .sort((a, b) => b.demand - a.demand)
    .slice(0, 10);

  // Impact forecast: tasks created over last 6 months and projection
  const monthlyTasks: Record<string, number> = {};
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = d.toLocaleDateString("ru-KZ", { month: "short", year: "2-digit" });
    monthlyTasks[key] = 0;
  }
  tasks.forEach((t) => {
    const d = new Date(t.created_at);
    const key = d.toLocaleDateString("ru-KZ", { month: "short", year: "2-digit" });
    if (monthlyTasks[key] !== undefined) monthlyTasks[key]++;
  });
  const trendData = Object.entries(monthlyTasks).map(([month, count]) => ({ month, tasks: count }));
  // Projection for next month
  const avg = trendData.length > 0 ? trendData.reduce((s, d) => s + d.tasks, 0) / trendData.length : 0;
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  trendData.push({
    month: nextMonth.toLocaleDateString("ru-KZ", { month: "short", year: "2-digit" }),
    tasks: Math.round(avg * 1.1),
  });

  // Volunteer status breakdown
  const statusCounts = { pending: 0, accepted: 0, rejected: 0, completed: 0 };
  applications.forEach((a) => {
    if (a.status in statusCounts) (statusCounts as any)[a.status]++;
    else statusCounts.pending++;
  });
  const statusData = [
    { name: "На рассмотрении", value: statusCounts.pending, color: "hsl(38, 92%, 50%)" },
    { name: "Приняты", value: statusCounts.accepted, color: "hsl(142, 70%, 45%)" },
    { name: "Отклонены", value: statusCounts.rejected, color: "hsl(0, 84%, 60%)" },
    { name: "Выполнены", value: statusCounts.completed, color: "hsl(217, 91%, 60%)" },
  ].filter(d => d.value > 0);

  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/30 bg-background/80 backdrop-blur-xl">
        <div className="container flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <Sun className="w-5 h-5 text-primary" />
            </div>
            <span className="text-lg font-bold text-foreground">Аналитика Sunbeam</span>
          </div>
        </div>
      </nav>

      <main className="pt-24 pb-12 container px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Дашборд аналитики</h1>
            <p className="text-muted-foreground mt-1">Статистика и прогнозы по задачам и волонтёрам</p>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Всего задач", value: tasks.length, icon: BarChart3 },
              { label: "Откликов", value: applications.length, icon: TrendingUp },
              { label: "Волонтёров", value: profiles.length, icon: Brain },
              { label: "Городов", value: Object.keys(cityActivity).length, icon: MapPin },
            ].map((s) => (
              <div key={s.label} className="glass-card gradient-border p-5">
                <div className="flex items-center gap-2 mb-2">
                  <s.icon className="w-4 h-4 text-primary" />
                  <span className="text-xs text-muted-foreground">{s.label}</span>
                </div>
                {dataLoading ? (
                  <Skeleton className="h-8 w-16 bg-secondary" />
                ) : (
                  <span className="text-2xl font-bold text-foreground">{s.value}</span>
                )}
              </div>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* City heatmap */}
            <div className="glass-card gradient-border p-6 space-y-4">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-foreground">Активность по городам</h3>
              </div>
              {dataLoading ? (
                <Skeleton className="h-48 bg-secondary" />
              ) : cityData.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Нет данных</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={cityData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.3} />
                    <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                    <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        color: "hsl(var(--foreground))",
                      }}
                    />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Skill demand */}
            <div className="glass-card gradient-border p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-foreground">Дефицит навыков</h3>
              </div>
              {dataLoading ? (
                <Skeleton className="h-48 bg-secondary" />
              ) : skillData.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Нет открытых задач</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={skillData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.3} />
                    <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                    <YAxis dataKey="name" type="category" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} width={90} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        color: "hsl(var(--foreground))",
                      }}
                    />
                    <Bar dataKey="demand" fill="hsl(280, 70%, 60%)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Impact forecast */}
            <div className="glass-card gradient-border p-6 space-y-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-foreground">Прогноз активности</h3>
              </div>
              {dataLoading ? (
                <Skeleton className="h-48 bg-secondary" />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.3} />
                    <XAxis dataKey="month" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                    <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        color: "hsl(var(--foreground))",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="tasks"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ fill: "hsl(var(--primary))", r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
              <p className="text-xs text-muted-foreground">Последняя точка — прогноз на основе тренда</p>
            </div>

            {/* Application status breakdown */}
            <div className="glass-card gradient-border p-6 space-y-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-foreground">Статусы откликов</h3>
              </div>
              {dataLoading ? (
                <Skeleton className="h-48 bg-secondary" />
              ) : statusData.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Нет откликов</p>
              ) : (
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width="50%" height={200}>
                    <PieChart>
                      <Pie data={statusData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={false}>
                        {statusData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          color: "hsl(var(--foreground))",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2">
                    {statusData.map((d) => (
                      <div key={d.name} className="flex items-center gap-2 text-sm">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                        <span className="text-muted-foreground">{d.name}: <span className="text-foreground font-medium">{d.value}</span></span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default AdminAnalytics;
