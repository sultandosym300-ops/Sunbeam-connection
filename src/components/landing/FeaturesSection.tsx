import { motion } from "framer-motion";
import { Brain, Clock, Shield, Search, Users, Star } from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "AI-подбор",
    description: "Семантический поиск подбирает волонтёров по навыкам и описанию задачи автоматически.",
  },
  {
    icon: Clock,
    title: "Умное расписание",
    description: "Сетка доступности позволяет найти тех, кто свободен именно тогда, когда нужно.",
  },
  {
    icon: Shield,
    title: "Верификация",
    description: "Email-подтверждение и проверка профилей — никаких фейков.",
  },
  {
    icon: Search,
    title: "Смарт-фильтры",
    description: "Персональная секция «Подходит вам» на основе ваших навыков и графика.",
  },
  {
    icon: Users,
    title: "Для всех",
    description: "Два типа профилей — волонтёр и организация — каждый с уникальным интерфейсом.",
  },
  {
    icon: Star,
    title: "Рейтинг",
    description: "Система отзывов помогает находить самых надёжных волонтёров.",
  },
];

const FeaturesSection = () => (
  <section className="py-24 relative">
    <div className="container px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-16"
      >
        <h2 className="text-3xl md:text-5xl font-bold mb-4">
          Почему <span className="text-gradient">Sunbeam Connect</span>?
        </h2>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Технологии, которые делают волонтёрство проще и эффективнее
        </p>
      </motion.div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1, duration: 0.5 }}
            className="glass-card gradient-border p-8 hover-lift group"
          >
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
              <f.icon className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">{f.title}</h3>
            <p className="text-muted-foreground leading-relaxed">{f.description}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default FeaturesSection;
