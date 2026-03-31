import { motion } from "framer-motion";
import { Users, Heart, Building2, Zap } from "lucide-react";

const stats = [
  { icon: Users, value: "500+", label: "Активных волонтёров", color: "text-primary" },
  { icon: Building2, value: "120+", label: "Организаций", color: "text-primary" },
  { icon: Heart, value: "2,400+", label: "Выполненных задач", color: "text-primary" },
  { icon: Zap, value: "98%", label: "Точность подбора", color: "text-primary" },
];

const StatsSection = () => (
  <section className="py-20 relative">
    <div className="container px-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1, duration: 0.5 }}
            className="glass-card gradient-border p-6 text-center hover-lift"
          >
            <stat.icon className={`w-8 h-8 mx-auto mb-3 ${stat.color}`} />
            <div className="text-3xl md:text-4xl font-extrabold text-foreground mb-1">{stat.value}</div>
            <div className="text-sm text-muted-foreground">{stat.label}</div>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default StatsSection;
