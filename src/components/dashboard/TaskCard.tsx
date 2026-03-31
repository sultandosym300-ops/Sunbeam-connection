import { motion } from "framer-motion";
import { Clock, MapPin, Calendar, Sparkles } from "lucide-react";

interface TaskCardProps {
  task: any;
  index: number;
  matchInfo?: { score: number; explanation: string };
  onClick?: () => void;
}

const TaskCard = ({ task, index, matchInfo, onClick }: TaskCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.05, duration: 0.4 }}
    className="glass-card gradient-border p-6 hover-lift group cursor-pointer"
    onClick={onClick}
  >
    <div className="space-y-3">
      {matchInfo && matchInfo.score > 0 && (
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <div className="flex items-center gap-2 flex-1">
            <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.round(matchInfo.score)}%`,
                  background: matchInfo.score >= 80 ? 'hsl(var(--primary))' : matchInfo.score >= 50 ? 'hsl(45 93% 47%)' : 'hsl(var(--muted-foreground))',
                }}
              />
            </div>
            <span className="text-sm font-bold text-primary whitespace-nowrap">{Math.round(matchInfo.score)}%</span>
          </div>
        </div>
      )}

      <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
        {task.title}
      </h3>
      <p className="text-sm text-muted-foreground line-clamp-2">{task.description}</p>

      {task.location && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="w-3 h-3" />
          {task.location}
        </div>
      )}

      {task.date && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Calendar className="w-3 h-3" />
          {new Date(task.date).toLocaleDateString("ru-KZ")}
        </div>
      )}

      {task.time_slot && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          {task.time_slot}
        </div>
      )}

      {task.required_skills?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-2">
          {task.required_skills.map((skill: string) => (
            <span
              key={skill}
              className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20"
            >
              {skill}
            </span>
          ))}
        </div>
      )}

      <div className="pt-2 text-xs text-muted-foreground">
        {task.profiles?.full_name && `Организация: ${task.profiles.full_name}`}
      </div>

      {matchInfo && matchInfo.explanation && (
        <p className="text-xs text-muted-foreground italic border-t border-border/20 pt-2">
          💡 {matchInfo.explanation}
        </p>
      )}
    </div>
  </motion.div>
);

export default TaskCard;
