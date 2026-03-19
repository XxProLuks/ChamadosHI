import React, { useMemo } from 'react';
import { Ticket } from '../types';
import { User, Activity, CheckCircle2, Clock } from 'lucide-react';

interface TechnicianWorkloadProps {
  tickets: Ticket[];
}

interface TechMetrics {
  name: string;
  avatar?: string;
  activeCount: number;
  resolvedToday: number;
  avgResponseMin: number | null;
}

const TechnicianWorkload: React.FC<TechnicianWorkloadProps> = ({ tickets }) => {
  const techMetrics = useMemo(() => {
    const grouped = new Map<string, { name: string; avatar?: string; tickets: Ticket[] }>();

    tickets.forEach(t => {
      if (t.technician_id && t.technician_name) {
        if (!grouped.has(t.technician_id)) {
          grouped.set(t.technician_id, { name: t.technician_name, avatar: t.technician_avatar, tickets: [] });
        }
        grouped.get(t.technician_id)!.tickets.push(t);
      }
    });

    const today = new Date().toISOString().split('T')[0] ?? '';
    const metrics: TechMetrics[] = [];

    grouped.forEach((val) => {
      const activeCount = val.tickets.filter(t => t.status === 'IN_PROGRESS' || t.status === 'WAITING').length;
      const resolvedToday = val.tickets.filter(t => t.status === 'DONE' && t.updated_at.startsWith(today)).length;

      const responseTimes = val.tickets
        .filter(t => t.first_response_at && t.created_at)
        .map(t => (new Date(t.first_response_at!).getTime() - new Date(t.created_at).getTime()) / 60000);

      const avgResponseMin = responseTimes.length > 0
        ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
        : null;

      metrics.push({ name: val.name, avatar: val.avatar, activeCount, resolvedToday, avgResponseMin });
    });

    return metrics.sort((a, b) => b.activeCount - a.activeCount);
  }, [tickets]);

  if (techMetrics.length === 0) return null;

  const getLoadColor = (count: number) => {
    if (count <= 3) return 'bg-emerald-500';
    if (count <= 6) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  return (
    <div className="mb-8">
      <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
        <Activity size={20} /> Carga de Trabalho
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {techMetrics.map(tech => (
          <div key={tech.name} className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-3 mb-3">
              {tech.avatar ? (
                <img src={tech.avatar} alt="" className="w-10 h-10 rounded-full" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <User size={20} className="text-blue-600" />
                </div>
              )}
              <div>
                <p className="font-semibold text-slate-800 dark:text-white">{tech.name}</p>
                <div className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${getLoadColor(tech.activeCount)}`} />
                  <span className="text-xs text-slate-500">{tech.activeCount} ativos</span>
                </div>
              </div>
            </div>

            <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2 mb-3">
              <div
                className={`h-2 rounded-full transition-all ${getLoadColor(tech.activeCount)}`}
                style={{ width: `${Math.min(tech.activeCount * 10, 100)}%` }}
              />
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                <CheckCircle2 size={14} className="text-green-500" />
                <span>{tech.resolvedToday} hoje</span>
              </div>
              <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                <Clock size={14} className="text-blue-500" />
                <span>{tech.avgResponseMin !== null ? `${tech.avgResponseMin}min` : '-'}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TechnicianWorkload;
