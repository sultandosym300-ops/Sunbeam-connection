import { useState } from "react";
import { motion } from "framer-motion";
import { X, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const SKILLS = [
  "Медицина", "ИТ", "Образование", "Животные", "Дети",
  "Экология", "Спорт", "Кулинария", "Транспорт", "Строительство",
  "Психология", "Юриспруденция", "Дизайн", "Маркетинг", "Переводы",
];

const TIME_SLOTS = ["Утро", "День", "Вечер"];

interface CreateTaskDialogProps {
  onClose: () => void;
  onCreated: () => void;
}

const CreateTaskDialog = ({ onClose, onCreated }: CreateTaskDialogProps) => {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [timeSlot, setTimeSlot] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const toggleSkill = (skill: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    const { error } = await supabase.from("tasks").insert({
      title,
      description,
      location,
      date: date || null,
      time_slot: timeSlot || null,
      required_skills: selectedSkills,
      organization_id: user.id,
      status: "open",
    });

    if (error) {
      toast.error("Ошибка при создании задачи");
      console.error(error);
    } else {
      toast.success("Задача создана!");
      onCreated();
      onClose();
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card gradient-border p-8 w-full max-w-lg max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-foreground">Новая задача</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Название</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Например: Помощь в приюте для животных"
              className="bg-secondary/50 border-border/50"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Описание</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Подробно опишите задачу..."
              className="bg-secondary/50 border-border/50 min-h-[100px]"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Локация</label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Алматы, Астана..."
                className="bg-secondary/50 border-border/50"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Дата</label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-secondary/50 border-border/50"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Время</label>
            <div className="flex gap-2">
              {TIME_SLOTS.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setTimeSlot(slot === timeSlot ? "" : slot)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    timeSlot === slot
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary/50 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {slot}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Необходимые навыки</label>
            <div className="flex flex-wrap gap-2">
              {SKILLS.map((skill) => (
                <button
                  key={skill}
                  type="button"
                  onClick={() => toggleSkill(skill)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    selectedSkills.includes(skill)
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary/50 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {selectedSkills.includes(skill) && <Check className="w-3 h-3 inline mr-1" />}
                  {skill}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 border-border/50"
            >
              Отмена
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Создать"}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default CreateTaskDialog;
