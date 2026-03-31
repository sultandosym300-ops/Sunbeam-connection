import { Sun, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const Navbar = () => {
  const navigate = useNavigate();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/30 bg-background/80 backdrop-blur-xl">
      <div className="container flex items-center justify-between h-16 px-4">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <Sun className="w-5 h-5 text-primary" />
          </div>
          <span className="text-lg font-bold text-foreground">Sunbeam Connect</span>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => navigate("/auth")}
          >
            <LogIn className="w-4 h-4 mr-2" />
            Войти
          </Button>
          <Button
            size="sm"
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
            onClick={() => navigate("/auth")}
          >
            Регистрация
          </Button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
