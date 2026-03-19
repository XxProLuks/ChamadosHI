import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { SLAConfig, TicketStatus } from '../types';

export interface SLAStatusResult {
  color: 'green' | 'yellow' | 'red' | 'paused';
  remainingMs: number;
  remainingText: string;
  expired: boolean;
}

export const getSLAStatus = (deadline: string, status?: TicketStatus): SLAStatusResult => {
  if (status === 'WAITING') {
    return { color: 'paused', remainingMs: 0, remainingText: 'Pausado', expired: false };
  }

  const now = Date.now();
  const deadlineMs = new Date(deadline).getTime();
  const remainingMs = deadlineMs - now;

  if (remainingMs <= 0) {
    return { color: 'red', remainingMs: 0, remainingText: 'Vencido', expired: true };
  }

  const hours = Math.floor(remainingMs / (1000 * 60 * 60));
  const mins = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
  const remainingText = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

  let color: 'green' | 'yellow' | 'red';
  if (remainingMs > 2 * 60 * 60 * 1000) color = 'green';
  else if (remainingMs > 30 * 60 * 1000) color = 'yellow';
  else color = 'red';

  return { color, remainingMs, remainingText, expired: false };
};

export const useSLA = () => {
  const [config, setConfig] = useState<SLAConfig[]>([]);

  useEffect(() => {
    supabase.from('sla_config').select('*').then(({ data }) => {
      if (data) setConfig(data);
    });
  }, []);

  return { config, getSLAStatus };
};
