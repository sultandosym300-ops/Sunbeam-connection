import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Sun, Mail, Lock, User, Building2, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"volunteer" | "organization">(
    searchParams.get("role") === "organization" ? "organization" : "volunteer"
  );
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Добро пожаловать!");
        navigate("/dashboard");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName, role },
          },
        });
        if (error) throw error;
        toast.success("Аккаунт создан! Добро пожаловать!");
        navigate("/dashboard");
      }
    } catch (err: any) {
      toast.error(err.message || "Произошла ошибка");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute top-1/3 left-1/4 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8 cursor-pointer" onClick={() => navigate("/")}>
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
            <Sun className="w-6 h-6 text-primary" />
          </div>
          <span className="text-2xl font-bold text-foreground">Sunbeam Connect</span>
        </div>

        <div className="glass-card gradient-border p-8">
          <h2 className="text-2xl font-bold text-foreground text-center mb-2">
            {isLogin ? "Вход" : "Регистрация"}
          </h2>
          <p className="text-muted-foreground text-center mb-6 text-sm">
            {isLogin ? "Рады видеть вас снова" : "Создайте аккаунт и начните помогать"}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              {!isLogin && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4"
                >
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Полное имя"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="pl-10 bg-secondary/50 border-border/50"
                      required
                    />
                  </div>

                  {/* Role selection */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setRole("volunteer")}
                      className={`p-4 rounded-lg border text-center transition-all ${
                        role === "volunteer"
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border/50 bg-secondary/30 text-muted-foreground hover:border-border"
                      }`}
                    >
                      <User className="w-6 h-6 mx-auto mb-2" />
                      <div className="text-sm font-medium">Волонтёр</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole("organization")}
                      className={`p-4 rounded-lg border text-center transition-all ${
                        role === "organization"
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border/50 bg-secondary/30 text-muted-foreground hover:border-border"
                      }`}
                    >
                      <Building2 className="w-6 h-6 mx-auto mb-2" />
                      <div className="text-sm font-medium">Организация</div>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 bg-secondary/50 border-border/50"
                required
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="password"
                placeholder="Пароль"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 bg-secondary/50 border-border/50"
                required
                minLength={6}
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-5"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  {isLogin ? "Войти" : "Создать аккаунт"}
                  <ArrowRight className="ml-2 w-4 h-4" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {isLogin ? "Нет аккаунта? Зарегистрируйтесь" : "Уже есть аккаунт? Войти"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Auth;
