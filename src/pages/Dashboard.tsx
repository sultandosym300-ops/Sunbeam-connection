import { useEffect, useState, useCallback } from "react";

import { useNavigate } from "react-router-dom";

import { motion } from "framer-motion";

import { Sun, LogOut, Plus, Search, Sparkles, Star, BarChart3 } from "lucide-react";

import { Button } from "@/components/ui/button";

import { useAuth } from "@/contexts/AuthContext";

import { supabase } from "@/integrations/supabase/client";

import { Skeleton } from "@/components/ui/skeleton";

import VolunteerProfile from "@/components/dashboard/VolunteerProfile";

import TaskCard from "@/components/dashboard/TaskCard";

import AITaskCreator from "@/components/dashboard/AITaskCreator";

import TaskDetailDialog from "@/components/dashboard/TaskDetailDialog";

import NotificationCenter from "@/components/dashboard/NotificationCenter";

import RiskAnalytics from "@/components/dashboard/RiskAnalytics";



const Dashboard = () => {

  const navigate = useNavigate();

  const { user, profile, loading: authLoading, signOut, refreshProfile: refreshAuthProfile } = useAuth();

  const [tasks, setTasks] = useState<any[]>([]);

  const [tasksLoading, setTasksLoading] = useState(true);

  const [tasksLoaded, setTasksLoaded] = useState(false);

  const [showCreateTask, setShowCreateTask] = useState(false);

  const [selectedTask, setSelectedTask] = useState<any>(null);

  const [matchResults, setMatchResults] = useState<Record<string, { score: number; explanation: string }>>({});

  const [matchLoading, setMatchLoading] = useState(false);

  const [matchAttempted, setMatchAttempted] = useState(false);



  // Redirect if not logged in — but don't block render

  useEffect(() => {

    if (!authLoading && !user) navigate("/auth");

  }, [user, authLoading, navigate]);



  // Load tasks — non-blocking with timeout

  const loadTasks = useCallback(async () => {

    if (!user) {

      setTasks([]);

      setTasksLoading(false);

      setTasksLoaded(true);

      return;

    }

    setTasksLoading(true);

    console.log("Dashboard: loading tasks");

    try {
      // Auto-close expired tasks (fire-and-forget)
      Promise.resolve(supabase.rpc("close_expired_tasks")).catch(() => {});

      const { data, error } = await supabase
        .from("tasks")
        .select("*, profiles!tasks_organization_id_fkey(full_name)")
        .eq("status", "open")
        .order("created_at", { ascending: false });

      if (error) console.error("Tasks load error:", error);
      setTasks(data || []);
    } catch (e: any) {
      console.error("Tasks load failed:", e?.message || e);
      setTasks([]);
    } finally {
      setTasksLoading(false);
      setTasksLoaded(true);
    }

  }, [user]);



  useEffect(() => {

    if (user) loadTasks();

  }, [user, loadTasks]);



  // Semantic matching — run once when conditions met

  useEffect(() => {

    if (

      matchAttempted ||

      matchLoading ||

      !tasksLoaded ||

      tasks.length === 0 ||

      !profile ||

      profile.role !== "volunteer" ||

      !profile.skills?.length

    ) return;



    const runMatch = async () => {

      setMatchLoading(true);

      setMatchAttempted(true);

      console.log("Dashboard: loading semantic matches");

      try {

        const result = await Promise.race([

          supabase.functions.invoke("match-volunteers", {

            body: { volunteer: profile, tasks: tasks.slice(0, 15) },

          }),

          new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error("Match timeout")), 30000);
          }),

        ]);

        const { data, error } = result;

        if (error) console.error("Match function error:", error);

        if (data?.matches) {

          const results: Record<string, { score: number; explanation: string }> = {};

          data.matches.forEach((m: any) => {

            results[m.task_id] = { score: m.score, explanation: m.explanation };

          });

          setMatchResults(results);

        }

      } catch (e: any) {

        console.error("Match error:", e?.message || e);

      } finally {

        setMatchLoading(false);

      }

    };

    runMatch();

  }, [tasksLoaded, tasks, profile, matchAttempted, matchLoading]);



  const handleProfileUpdated = async () => {

    console.log("Dashboard: refreshing profile after AI onboarding");

    await refreshAuthProfile();

    setMatchResults({});

    setMatchAttempted(false);

    await loadTasks();

  };



  const handleSignOut = async () => {

    await signOut();

    navigate("/");

  };



  // Show shell immediately while auth loads

  const isVolunteer = profile?.role === "volunteer";

  const isOrganization = profile?.role === "organization";

  const orgTasks = tasks.filter(t => t.organization_id === user?.id);

  const displayTasks = isOrganization ? orgTasks : tasks;



  const matchedTasks = isVolunteer

    ? [...displayTasks].filter(t => matchResults[t.id]?.score >= 50).sort((a, b) => (matchResults[b.id]?.score || 0) - (matchResults[a.id]?.score || 0))

    : [];

  const otherTasks = isVolunteer

    ? displayTasks.filter(t => !matchResults[t.id] || matchResults[t.id].score < 50)

    : displayTasks;



  const needsOnboarding = isVolunteer && (!profile?.skills?.length || !profile?.bio || !profile?.age || !profile?.experience);



  return (

    <div className="min-h-screen bg-background">

      {/* Nav — always visible */}

      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/30 bg-background/80 backdrop-blur-xl">

        <div className="container flex items-center justify-between h-16 px-4">

          <div className="flex items-center gap-2">

            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">

              <Sun className="w-5 h-5 text-primary" />

            </div>

            <span className="text-lg font-bold text-foreground">Sunbeam Connect</span>

          </div>

          <div className="flex items-center gap-3">

            {isVolunteer && profile?.reputation_points > 0 && (

              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-400/10 border border-yellow-400/20">

                <Star className="w-3.5 h-3.5 text-yellow-400" />

                <span className="text-xs font-bold text-yellow-400">{profile.reputation_points}</span>

              </div>

            )}

            <NotificationCenter />

            <span className="text-sm text-muted-foreground hidden md:block">

              {profile?.full_name || user?.email || "…"}

            </span>

            <Button

              variant="ghost"

              size="sm"

              onClick={handleSignOut}

              className="text-muted-foreground hover:text-foreground"

            >

              <LogOut className="w-4 h-4" />

            </Button>

          </div>

        </div>

      </nav>



      <main className="pt-24 pb-12 container px-4">

        <motion.div

          initial={{ opacity: 0, y: 20 }}

          animate={{ opacity: 1, y: 0 }}

          className="space-y-8"

        >

          {/* Header — always visible */}

          <div className="flex items-center justify-between">

            <div>

              <h1 className="text-3xl font-bold text-foreground">

                {isOrganization ? "Панель организации" : "Мои задачи"}

              </h1>

              <p className="text-muted-foreground mt-1">

                {isOrganization

                  ? "Создавайте задачи через AI-интервьюер"

                  : "Задачи подобраны по вашему профилю"}

              </p>

            </div>

            {isOrganization && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  className="border-border/50"
                  onClick={() => navigate("/admin-analytics")}
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Аналитика
                </Button>
                <Button
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  onClick={() => setShowCreateTask(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  AI-Интервьюер
                </Button>
              </div>

            )}

          </div>



          {/* Risk Analytics — async block */}

          {isOrganization && orgTasks.length > 0 && (

            <RiskAnalytics tasks={orgTasks} />

          )}



          {/* AI Onboarding for incomplete volunteer profiles */}

          {needsOnboarding && (

              <VolunteerProfile profile={profile} onUpdate={handleProfileUpdated} />

          )}



          {/* Matched Tasks — async block */}

          {isVolunteer && (matchedTasks.length > 0 || matchLoading) && (

            <div className="space-y-4">

              <div className="flex items-center gap-2">

                <Sparkles className="w-5 h-5 text-primary" />

                <h2 className="text-xl font-bold text-foreground">Подходит вам</h2>

              </div>

              <p className="text-sm text-muted-foreground">

                AI подобрал задачи по смыслу ваших навыков и опыта

              </p>

              {matchLoading ? (

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">

                  {[1, 2, 3].map((i) => (

                    <div key={i} className="glass-card p-6 space-y-3">

                      <Skeleton className="h-4 w-20 bg-secondary" />

                      <Skeleton className="h-6 w-3/4 bg-secondary" />

                      <Skeleton className="h-4 w-full bg-secondary" />

                    </div>

                  ))}

                </div>

              ) : (

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">

                  {matchedTasks.map((task, i) => (

                    <TaskCard

                      key={task.id}

                      task={task}

                      index={i}

                      matchInfo={matchResults[task.id]}

                      onClick={() => setSelectedTask(task)}

                    />

                  ))}

                </div>

              )}

            </div>

          )}



          {/* All Tasks — async block with empty state */}

          <div className="space-y-4">

            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">

              <Search className="w-5 h-5" />

              {isOrganization ? "Ваши задачи" : matchedTasks.length > 0 ? "Другие задачи" : "Все задачи"}

            </h2>


{tasksLoading && tasks.length === 0 ? (
  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
    {/* Искусственная карточка, чтобы сайт не выглядел пустым */}
    <div className="glass-card p-6 border border-primary/20 bg-primary/5 animate-pulse">
      <div className="flex justify-between items-start mb-4">
        <span className="px-2 py-1 rounded text-xs font-medium bg-primary/20 text-primary">Синхронизация...</span>
      </div>
      <h3 className="text-lg font-bold">Загрузка актуальных задач</h3>
      <p className="text-sm text-muted-foreground mt-2">ИИ анализирует базу данных Sunbeam и подбирает лучшие варианты...</p>
      <div className="flex gap-2 pt-4">
        <div className="h-6 w-16 rounded-full bg-secondary" />
        <div className="h-6 w-20 rounded-full bg-secondary" />
      </div>
    </div>
  </div>
 ) : otherTasks.length === 0 ? (

              <div className="glass-card p-12 text-center">

                <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />

                <h3 className="text-lg font-semibold text-foreground mb-2">

                  {matchedTasks.length > 0 ? "Все остальные задачи уже в подборке" : "Пока нет задач"}

                </h3>

                <p className="text-muted-foreground">

                  {isOrganization

                    ? "Создайте первую задачу через AI-интервьюер"

                    : "Скоро здесь появятся задачи от организаций"}

                </p>

              </div>

            ) : (

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">

                {otherTasks.map((task, i) => (

                  <TaskCard

                    key={task.id}

                    task={task}

                    index={i}

                    matchInfo={matchResults[task.id]}

                    onClick={() => setSelectedTask(task)}

                  />

                ))}

              </div>

            )}

          </div>

        </motion.div>

      </main>



      {showCreateTask && (

        <AITaskCreator onClose={() => setShowCreateTask(false)} onCreated={loadTasks} />

      )}



      {selectedTask && (

        <TaskDetailDialog

          task={selectedTask}

          onClose={() => setSelectedTask(null)}

          matchInfo={matchResults[selectedTask.id]}

        />

      )}

    </div>

  );

};



export default Dashboard;
