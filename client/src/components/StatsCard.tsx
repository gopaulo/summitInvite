import { Card, CardContent } from "@/components/ui/card";
import { ReactNode } from "react";

interface StatsCardProps {
  title: string;
  value: number;
  icon: ReactNode;
  trend: string;
  trendUp: boolean;
}

export default function StatsCard({ title, value, icon, trend, trendUp }: StatsCardProps) {
  return (
    <Card className="stats-card">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-sm font-medium">{title}</p>
            <p className="text-3xl font-bold text-primary" data-testid={`stat-${title.toLowerCase().replace(/\s+/g, '-')}`}>
              {value.toLocaleString()}
            </p>
          </div>
          <div className="bg-accent/10 p-3 rounded-lg">
            <div className="text-accent text-xl">
              {icon}
            </div>
          </div>
        </div>
        <div className="mt-4 flex items-center text-sm">
          <span className={trendUp ? "text-green-600" : "text-red-600"}>
            {trendUp ? "↑" : "↓"}
          </span>
          <span className="text-muted-foreground ml-2">{trend}</span>
        </div>
      </CardContent>
    </Card>
  );
}
