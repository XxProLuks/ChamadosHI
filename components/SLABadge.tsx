import React from 'react';
import { Clock, Pause } from 'lucide-react';
import { getSLAStatus } from '../hooks/useSLA';
import { TicketStatus } from '../types';

interface SLABadgeProps {
  deadline?: string;
  ticketStatus?: TicketStatus;
}

const colorMap = {
  green: 'bg-emerald-100 text-emerald-700',
  yellow: 'bg-amber-100 text-amber-700',
  red: 'bg-rose-100 text-rose-700',
  paused: 'bg-slate-100 text-slate-500'
};

const SLABadge: React.FC<SLABadgeProps> = ({ deadline, ticketStatus }) => {
  if (!deadline) return null;

  const status = getSLAStatus(deadline, ticketStatus);
  const Icon = status.color === 'paused' ? Pause : Clock;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${colorMap[status.color]}`}>
      <Icon size={12} />
      {status.remainingText}
    </span>
  );
};

export default SLABadge;
