import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { User, Star, Briefcase, Calendar, Brain } from "lucide-react";
import ReputationRadar from "./ReputationRadar";

interface VolunteerProfilePopupProps {
  volunteer: any;
  open: boolean;
  onClose: () => void;
}

const VolunteerProfilePopup = ({ volunteer, open, onClose }: VolunteerProfilePopupProps) => {
  if (!volunteer) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="glass-card gradient-border border-border/30 bg-card max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
              <User className="w-6 h-6 text-primary" />
            </div>
            <div>
              <span className="text-lg font-bold text-foreground">{volunteer.full_name || "Волонтёр"}</span>
              {volunteer.reputation_points > 0 && (
                <div className="flex items-center gap-1 mt-0.5">
                  <Star className="w-3.5 h-3.5 text-yellow-400" />
                  <span className="text-xs font-bold text-yellow-400">{volunteer.reputation_points} баллов</span>
                </div>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Radar Chart */}
          <ReputationRadar volunteer={volunteer} />

          {volunteer.age && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4 text-primary/70" />
              <span>Возраст: <span className="text-foreground font-medium">{volunteer.age} лет</span></span>
            </div>
          )}

          {volunteer.experience && (
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Briefcase className="w-4 h-4 text-primary/70" />
                <span className="font-medium text-foreground">Опыт</span>
              </div>
              <p className="text-sm text-muted-foreground ml-6">{volunteer.experience}</p>
            </div>
          )}

          {volunteer.bio && (
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="w-4 h-4 text-primary/70" />
                <span className="font-medium text-foreground">О себе</span>
              </div>
              <p className="text-sm text-muted-foreground ml-6">{volunteer.bio}</p>
            </div>
          )}

          {volunteer.skills?.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Brain className="w-4 h-4 text-primary/70" />
                <span className="font-medium text-foreground">Навыки</span>
              </div>
              <div className="flex flex-wrap gap-1.5 ml-6">
                {volunteer.skills.map((s: string) => (
                  <span key={s} className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">{s}</span>
                ))}
              </div>
            </div>
          )}

          {volunteer.availability && Object.keys(volunteer.availability).length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-primary/70" />
                <span className="font-medium text-foreground">Доступность</span>
              </div>
              <div className="ml-6 grid grid-cols-2 gap-1">
                {Object.entries(volunteer.availability).map(([day, times]: [string, any]) => (
                  <div key={day} className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{day}:</span> {Array.isArray(times) ? times.join(", ") : String(times)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VolunteerProfilePopup;
