import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from "recharts";

interface ReputationRadarProps {
  volunteer: {
    reputation_points?: number;
    skills?: string[];
    age?: number;
    experience?: string;
  };
  stats?: {
    completedTasks: number;
    totalTasks: number;
    approvedPhotos: number;
    cancelledTasks: number;
  };
}

const ReputationRadar = ({ volunteer, stats }: ReputationRadarProps) => {
  const totalTasks = stats?.totalTasks || 1;
  const reliability = stats ? Math.min(100, ((stats.completedTasks / totalTasks) * 100)) : 50;
  const skillScore = Math.min(100, (volunteer.skills?.length || 0) * 15);
  const activity = Math.min(100, (stats?.totalTasks || 0) * 10);
  const quality = stats?.approvedPhotos ? Math.min(100, (stats.approvedPhotos / Math.max(1, stats.completedTasks)) * 100) : 50;
  const punctuality = Math.max(0, 100 - (stats?.cancelledTasks || 0) * 20);

  const data = [
    { subject: "Надёжность", value: Math.round(reliability) },
    { subject: "Навыки", value: Math.round(skillScore) },
    { subject: "Активность", value: Math.round(activity) },
    { subject: "Качество", value: Math.round(quality) },
    { subject: "Пунктуальность", value: Math.round(punctuality) },
  ];

  return (
    <div className="w-full h-52">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
          <PolarGrid stroke="hsl(var(--border))" strokeOpacity={0.5} />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={false}
            axisLine={false}
          />
          <Radar
            name="Рейтинг"
            dataKey="value"
            stroke="hsl(var(--primary))"
            fill="hsl(var(--primary))"
            fillOpacity={0.25}
            strokeWidth={2}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ReputationRadar;
