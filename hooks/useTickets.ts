import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Ticket, TicketStatus } from '../types';
import toast from 'react-hot-toast';
import type { Session } from '@supabase/supabase-js';

interface UseTicketsOptions {
    session: Session | null;
}

interface UseTicketsReturn {
    tickets: Ticket[];
    loading: boolean;
    fetchTickets: () => Promise<void>;
    createTicket: (ticket: Partial<Ticket>) => Promise<boolean>;
    updateStatus: (id: string, status: TicketStatus, profileRole?: string) => Promise<boolean>;
    deleteTicket: (id: string) => Promise<boolean>;
    // Computed values
    todoCount: number;
    inProgressCount: number;
    doneCount: number;
    criticalCount: number;
}

/**
 * Custom hook for managing tickets
 * Provides CRUD operations and computed statistics
 */
export function useTickets({ session }: UseTicketsOptions): UseTicketsReturn {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchTickets = useCallback(async () => {
        if (!session) return;

        try {
            const { data, error } = await supabase
                .from('tickets')
                .select(`
                    *,
                    requester:profiles!requester_id(full_name),
                    technician:profiles!technician_id(full_name, avatar_url),
                    sector:sectors(name)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (data) {
                const formattedTickets = data.map((t: any) => ({
                    ...t,
                    requester_name: t.requester?.full_name,
                    technician_name: t.technician?.full_name,
                    technician_avatar: t.technician?.avatar_url,
                    sector_name: t.sector?.name
                }));
                setTickets(formattedTickets);
            }
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : 'Erro desconhecido';
            console.error('Erro ao buscar tickets:', msg);
            toast.error('Erro ao buscar chamados');
        } finally {
            setLoading(false);
        }
    }, [session]);

    const createTicket = useCallback(async (newTicket: Partial<Ticket>): Promise<boolean> => {
        if (!session) return false;

        try {
            const finalPriority = newTicket.priority || 'MEDIUM';

            const { error } = await supabase
                .from('tickets')
                .insert([{
                    ...newTicket,
                    priority: finalPriority,
                    is_critical: newTicket.is_critical || finalPriority === 'CRITICAL',
                    requester_id: session.user.id,
                    image_urls: newTicket.image_urls
                }]);

            if (error) throw error;

            toast.success('Chamado criado com sucesso!');
            await fetchTickets();
            return true;
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : 'Erro desconhecido';
            toast.error('Erro ao criar chamado: ' + msg);
            return false;
        }
    }, [session, fetchTickets]);

    const updateStatus = useCallback(async (
        id: string,
        status: TicketStatus,
        profileRole?: string
    ): Promise<boolean> => {
        if (!session) return false;

        try {
            const updates: Record<string, unknown> = {
                status,
                updated_at: new Date().toISOString()
            };

            if (status === 'IN_PROGRESS' && profileRole !== 'SOLICITANTE') {
                updates.technician_id = session.user.id;
            }

            const { error } = await supabase
                .from('tickets')
                .update(updates)
                .eq('id', id);

            if (error) throw error;

            // Update local state
            setTickets(prev => prev.map(t =>
                t.id === id ? { ...t, ...updates } as Ticket : t
            ));

            toast.success('Status atualizado!');
            return true;
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : 'Erro desconhecido';
            toast.error('Erro ao atualizar status: ' + msg);
            return false;
        }
    }, [session]);

    const deleteTicket = useCallback(async (id: string): Promise<boolean> => {
        try {
            const { error } = await supabase
                .from('tickets')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setTickets(prev => prev.filter(t => t.id !== id));
            toast.success('Chamado excluído!');
            return true;
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : 'Erro desconhecido';
            toast.error('Erro ao excluir chamado: ' + msg);
            return false;
        }
    }, []);

    // Computed statistics
    const { todoCount, inProgressCount, doneCount, criticalCount } = useMemo(() => ({
        todoCount: tickets.filter(t => t.status === 'TODO').length,
        inProgressCount: tickets.filter(t => t.status === 'IN_PROGRESS').length,
        doneCount: tickets.filter(t => t.status === 'DONE').length,
        criticalCount: tickets.filter(t => t.is_critical).length
    }), [tickets]);

    // Initial fetch and realtime subscription
    useEffect(() => {
        if (!session) return;

        fetchTickets();

        const subscription = supabase
            .channel('tickets-hook-channel')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, () => {
                fetchTickets();
            })
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [session, fetchTickets]);

    return {
        tickets,
        loading,
        fetchTickets,
        createTicket,
        updateStatus,
        deleteTicket,
        todoCount,
        inProgressCount,
        doneCount,
        criticalCount
    };
}

export default useTickets;
