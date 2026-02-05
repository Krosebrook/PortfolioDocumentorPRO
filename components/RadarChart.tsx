import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { RepoAudit } from '../types';

interface HealthChartProps {
  audit: RepoAudit;
}

const HealthChart: React.FC<HealthChartProps> = ({ audit }) => {
  const data = [
    { subject: 'Docs', A: audit.documentation, fullMark: 5 },
    { subject: 'DevX', A: audit.buildDevX, fullMark: 5 },
    { subject: 'Testing', A: audit.testing, fullMark: 5 },
    { subject: 'CI/CD', A: audit.ciCd, fullMark: 5 },
    { subject: 'Security', A: audit.security, fullMark: 5 },
    { subject: 'Observability', A: audit.observability, fullMark: 5 },
    { subject: 'Maintainability', A: audit.maintainability, fullMark: 5 },
    { subject: 'Prod Ready', A: audit.productionReadiness, fullMark: 5 },
  ];

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
          <PolarGrid stroke="#475569" />
          <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10 }} />
          <PolarRadiusAxis angle={30} domain={[0, 5]} tick={false} axisLine={false} />
          <Radar
            name="Score"
            dataKey="A"
            stroke="#10b981"
            strokeWidth={2}
            fill="#10b981"
            fillOpacity={0.3}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default HealthChart;
