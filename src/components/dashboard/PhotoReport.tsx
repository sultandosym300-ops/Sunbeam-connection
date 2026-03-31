import { useState } from "react";
import { Upload, Loader2, CheckCircle, XCircle, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface PhotoReportProps {
  task: any;
  application: any;
  onUpdate: () => void;
}

const PhotoReport = ({ task, application, onUpdate }: PhotoReportProps) => {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(application?.photo_url || null);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const base64 = await fileToBase64(file);

      const filePath = `${application.id}/${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("photo-reports")
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("photo-reports")
        .getPublicUrl(filePath);
      const photoUrl = urlData.publicUrl;
      setPreview(photoUrl);

      toast.info("AI анализирует фото...");
      const { data: verdict, error: aiError } = await supabase.functions.invoke("validate-photo", {
        body: {
          image_base64: base64,
          task_title: task.title,
          task_description: task.description,
        },
      });
      if (aiError) throw aiError;

      await (supabase as any).from("task_applications")
        .update({
          photo_url: photoUrl,
          ai_verdict: verdict.verdict,
          ai_comment: verdict.comment,
        })
        .eq("id", application.id);

      // Award reputation points if approved
      if (verdict.verdict === "approved" && user) {
        const { data: currentProfile } = await supabase
          .from("profiles")
          .select("reputation_points")
          .eq("id", user.id)
          .single();

        const currentPoints = (currentProfile as any)?.reputation_points || 0;
        await supabase
          .from("profiles")
          .update({ reputation_points: currentPoints + 10 } as any)
          .eq("id", user.id);

        // Create notification for volunteer
        await (supabase as any).from("notifications").insert({
          user_id: user.id,
          title: "Фото-отчёт одобрен! +10 баллов",
          body: `Ваш отчёт по задаче "${task.title}" одобрен AI. Вы получили 10 баллов репутации!`,
          type: "approved",
          task_id: task.id,
        });

        toast.success(`✅ Фото одобрено! +10 к репутации`);
      } else if (verdict.verdict === "rejected" && user) {
        await (supabase as any).from("notifications").insert({
          user_id: user.id,
          title: "Фото-отчёт отклонён",
          body: `AI отклонил ваш отчёт по задаче "${task.title}": ${verdict.comment}`,
          type: "rejected",
          task_id: task.id,
        });
        toast.error(`❌ Фото отклонено: ${verdict.comment}`);
      }

      onUpdate();
    } catch (e: any) {
      toast.error("Ошибка: " + (e.message || "Не удалось загрузить"));
      console.error(e);
    }
    setUploading(false);
  };

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
        <Camera className="w-4 h-4" />
        Фото-отчёт
      </h4>

      {preview && (
        <div className="space-y-2">
          <img src={preview} alt="Отчёт" className="rounded-lg max-h-48 object-cover w-full" />
          {application?.ai_verdict && (
            <div className={`flex items-center gap-2 text-sm font-medium ${
              application.ai_verdict === "approved" ? "text-green-400" : "text-red-400"
            }`}>
              {application.ai_verdict === "approved" ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
              {application.ai_verdict === "approved" ? "Одобрено AI" : "Отклонено AI"}
            </div>
          )}
          {application?.ai_comment && (
            <p className="text-xs text-muted-foreground">{application.ai_comment}</p>
          )}
        </div>
      )}

      <div>
        <input
          type="file"
          id="photo-upload"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
          disabled={uploading}
        />
        <Button
          type="button"
          variant="outline"
          className="w-full border-border/50"
          disabled={uploading}
          onClick={() => document.getElementById("photo-upload")?.click()}
        >
          {uploading ? (
            <><Loader2 className="w-4 h-4 animate-spin mr-2" /> AI анализирует...</>
          ) : (
            <><Upload className="w-4 h-4 mr-2" /> {preview ? "Загрузить новое фото" : "Загрузить фото-отчёт"}</>
          )}
        </Button>
      </div>
    </div>
  );
};

export default PhotoReport;
