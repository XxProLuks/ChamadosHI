import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Ticket, Sector, TicketStatus } from '../types';
import { useTickets } from '../hooks/useTickets';
import { useAuth } from './AuthContext';

interface TicketContextType {
  tickets: Ticket[];
  ticketsLoading: boolean;
  hasMore: boolean;
  fetchNextPage: () => void;
  updateTicketStatus: (id: string, status: TicketStatus) => Promise<{ success?: boolean; error?: any }>;
  deleteTicket: (id: string) => Promise<{ success?: boolean; error?: any }>;
  pinTicket: (id: string, isPinned: boolean) => Promise<{ success?: boolean; error?: any }>;
  sectors: Sector[];
  refreshTickets: () => void;
}

const TicketContext = createContext<TicketContextType | undefined>(undefined);

export const TicketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session, profile } = useAuth();
  const [sectors, setSectors] = useState<Sector[]>([]);

  const {
    tickets, loading: ticketsLoading, hasMore, fetchNextPage,
    updateTicketStatus: rawUpdate, deleteTicket: rawDelete,
    pinTicket: rawPin, refreshTickets
  } = useTickets(session?.user.id, profile?.role);

  useEffect(() => {
    if (session) {
      supabase.from('sectors').select('*').order('name').then(({ data }) => {
        if (data) setSectors(data);
      });
    }
  }, [session]);

  const updateTicketStatus = useCallback(async (id: string, status: TicketStatus) => {
    if (!session) return { error: 'No session' };
    return rawUpdate(id, status, session.user.id);
  }, [session, rawUpdate]);

  const deleteTicket = useCallback(async (id: string) => {
    return rawDelete(id);
  }, [rawDelete]);

  const pinTicket = useCallback(async (id: string, isPinned: boolean) => {
    if (!session) return { error: 'No session' };
    return rawPin(id, isPinned, session.user.id);
  }, [session, rawPin]);

  return (
    <TicketContext.Provider value={{
      tickets, ticketsLoading, hasMore, fetchNextPage,
      updateTicketStatus, deleteTicket, pinTicket, sectors, refreshTickets
    }}>
      {children}
    </TicketContext.Provider>
  );
};

export const useTicketContext = () => {
  const ctx = useContext(TicketContext);
  if (!ctx) throw new Error('useTicketContext must be used within TicketProvider');
  return ctx;
};
