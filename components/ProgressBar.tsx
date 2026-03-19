import React from 'react';
import { TicketStatus } from '../types';
import { Circle, Clock, Pause, CheckCircle2 } from 'lucide-react';

interface ProgressBarProps {
  status: TicketStatus;
}

const steps = [
  { key: 'TODO', label: 'Aberto', icon: Circle },
  { key: 'IN_PROGRESS', label: 'Em Andamento', icon: Clock },
  { key: 'WAITING', label: 'Aguardando', icon: Pause },
  { key: 'DONE', label: 'Concluído', icon: CheckCircle2 }
] as const;

const statusOrder: Record<TicketStatus, number> = {
  TODO: 0, IN_PROGRESS: 1, WAITING: 1, DONE: 3
};

const ProgressBar: React.FC<ProgressBarProps> = ({ status }) => {
  const currentIdx = statusOrder[status];

  return (
    <div className="flex items-center gap-1 w-full">
      {steps.map((step, i) => {
        const isActive = step.key === status;
        const isDone = i < currentIdx;
        const Icon = step.icon;

        return (
          <React.Fragment key={step.key}>
            {i > 0 && (
              <div className={`flex-1 h-0.5 ${isDone ? 'bg-blue-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
            )}
            <div className="flex flex-col items-center">
              <Icon
                size={16}
                className={
                  isActive ? 'text-blue-600' :
                  isDone ? 'text-blue-500' :
                  'text-slate-300 dark:text-slate-600'
                }
              />
              <span className={`text-[10px] mt-1 ${isActive ? 'text-blue-600 font-semibold' : 'text-slate-400'}`}>
                {step.label}
              </span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default ProgressBar;
