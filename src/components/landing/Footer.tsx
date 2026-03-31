import { Sun, Heart } from "lucide-react";

const Footer = () => (
  <footer className="border-t border-border/30 py-12">
    <div className="container px-4">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Sun className="w-5 h-5 text-primary" />
          <span className="font-bold text-foreground">Sunbeam Connect</span>
        </div>
        <p className="text-sm text-muted-foreground flex items-center gap-1">
          Сделано с <Heart className="w-3 h-3 text-destructive" /> в Казахстане © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  </footer>
);

export default Footer;
