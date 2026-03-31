import { useState, useEffect } from "react";
import { Bell, X, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const NotificationCenter = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [open, setOpen] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    if (!user) return;
    loadNotifications();

    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          setNotifications(prev => [payload.new as any, ...prev]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const loadNotifications = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications" as any)
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    setNotifications((data as any[]) || []);
  };

  const markAllRead = async () => {
    if (!user) return;
    await supabase
      .from("notifications" as any)
      .update({ read: true } as any)
      .eq("user_id", user.id)
      .eq("read", false);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const typeIcon: Record<string, string> = {
    match: "🎯",
    approved: "✅",
    rejected: "❌",
    reminder: "⏰",
    info: "ℹ️",
    application: "📩",
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center min-w-[18px] h-[18px]">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute right-0 top-12 w-80 max-h-96 glass-card gradient-border overflow-hidden z-50"
          >
            <div className="flex items-center justify-between p-4 border-b border-border/30">
              <h3 className="text-sm font-bold text-foreground">Уведомления</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-xs text-primary hover:underline">
                    Прочитать все
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto max-h-72">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  Нет уведомлений
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-3 border-b border-border/10 hover:bg-secondary/30 transition-all ${
                      !n.read ? "bg-primary/5" : ""
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-sm mt-0.5">{typeIcon[n.type] || "📌"}</span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${!n.read ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                          {n.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                        <p className="text-xs text-muted-foreground/60 mt-1">
                          {new Date(n.created_at).toLocaleString("ru-KZ", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationCenter;
