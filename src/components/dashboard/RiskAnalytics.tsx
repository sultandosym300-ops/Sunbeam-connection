import { useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, TrendingUp, Loader2, Shield, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface RiskItem {
  task_id: string;
  risk_percent: number;
  risk_level: "low" | "medium" | "high" | "critical";
  recommendation: string;
}

const RiskAnalytics = ({ tasks }: { tasks: any[] }) => {
  const [analyses, setAnalyses] = useState<RiskItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const loadRiskAnalysis = async () => {
    if (tasks.length === 0) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("risk-analytics", {
        body: { tasks: tasks.slice(0, 10) },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setAnalyses(data.analyses || []);
      setLoaded(true);
    } catch (e: any) {
      toast.error(e.message || "Ошибка анализа");
    }
    setLoading(false);
  };

  const taskMap = new Map(tasks.map(t => [t.id, t]));

  const riskColors: Record<string, string> = {
    low: "text-green-400",
    medium: "text-yellow-400",
    high: "text-orange-400",
    critical: "text-red-400",
  };

  const riskBg: Record<string, string> = {
    low: "bg-green-400/10 border-green-400/20",
    medium: "bg-yellow-400/10 border-yellow-400/20",
    high: "bg-orange-400/10 border-orange-400/20",
    critical: "bg-red-400/10 border-red-400/20",
  };

  const riskLabel: Record<string, string> = {
    low: "Низкий",
    medium: "Средний",
    high: "Высокий",
    critical: "Критический",
  };

  if (!loaded) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card gradient-border p-6"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-400/10 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <h3 className="font-bold text-foreground">Аналитика рисков</h3>
              <p className="text-xs text-muted-foreground">AI оценит вероятность срыва задач</p>
            </div>
          </div>
          <Button
            onClick={loadRiskAnalysis}
            disabled={loading || tasks.length === 0}
            size="sm"
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Zap className="w-4 h-4 mr-1" /> Анализ</>}
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card gradient-border p-6 space-y-4"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-orange-400/10 flex items-center justify-center">
          <AlertTriangle className="w-5 h-5 text-orange-400" />
        </div>
        <div>
          <h3 className="font-bold text-foreground">Аналитика рисков</h3>
          <p className="text-xs text-muted-foreground">AI-прогноз вероятности срыва</p>
        </div>
      </div>

      {analyses.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">Нет данных для анализа</p>
      ) : (
        <div className="space-y-3">
          {analyses
            .sort((a, b) => b.risk_percent - a.risk_percent)
            .map((item) => {
              const task = taskMap.get(item.task_id);
              return (
                <div key={item.task_id} className={`p-3 rounded-lg border ${riskBg[item.risk_level]}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-foreground line-clamp-1">
                      {task?.title || "Задача"}
                    </span>
                    <span className={`text-xs font-bold ${riskColors[item.risk_level]}`}>
                      {item.risk_percent}% — {riskLabel[item.risk_level]}
                    </span>
                  </div>
                  {/* Risk bar */}
                  <div className="h-1.5 bg-secondary/50 rounded-full mb-2">
                    <div
                      className={`h-full rounded-full transition-all ${
                        item.risk_level === "critical" ? "bg-red-400" :
                        item.risk_level === "high" ? "bg-orange-400" :
                        item.risk_level === "medium" ? "bg-yellow-400" : "bg-green-400"
                      }`}
                      style={{ width: `${item.risk_percent}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">💡 {item.recommendation}</p>
                </div>
              );
            })}
        </div>
      )}

      <Button
        onClick={loadRiskAnalysis}
        disabled={loading}
        variant="outline"
        size="sm"
        className="w-full border-border/50"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <TrendingUp className="w-4 h-4 mr-2" />}
        Обновить анализ
      </Button>
    </motion.div>
  );
};

export default RiskAnalytics;
