import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Ticket, TicketStatus, UserRole } from '../types';
import toast from 'react-hot-toast';

export const useTickets = (userId: string | undefined, userRole: UserRole | undefined) => {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const PAGE_SIZE = 20;

    const fetchTickets = useCallback(async (isInitial = true) => {
        if (!userId || !userRole) return;

        if (isInitial) {
            setLoading(true);
            setPage(0);
        }

        try {
            const start = isInitial ? 0 : (page + 1) * PAGE_SIZE;
            const end = start + PAGE_SIZE - 1;

            let query = supabase
                .from('tickets')
                .select(`
                    *,
                    requester:profiles!requester_id(full_name),
                    technician:profiles!technician_id(full_name, avatar_url),
                    sector:sectors(name)
                `, { count: 'exact' });

            // Admin/Tech sees all, Solicitante only their own
            if (userRole === 'SOLICITANTE') {
                query = query.eq('requester_id', userId);
            }

            const { data, error, count } = await query
                .order('created_at', { ascending: false })
                .range(start, end);

            if (error) throw error;

            if (data) {
                const formattedTickets = data.map((t: any) => ({
                    ...t,
                    requester_name: t.requester?.full_name,
                    technician_name: t.technician?.full_name,
                    technician_avatar: t.technician?.avatar_url,
                    sector_name: t.sector?.name
                }));

                setTickets(prev => isInitial ? formattedTickets : [...prev, ...formattedTickets]);
                setHasMore(count ? (isInitial ? formattedTickets : [...tickets, ...formattedTickets]).length < count : false);
                if (!isInitial) setPage(prev => prev + 1);
            }
        } catch (error: any) {
            toast.error('Erro ao buscar chamados: ' + error.message);
        } finally {
            setLoading(false);
        }
    }, [userId, userRole, page, tickets]);

    const fetchNextPage = () => {
        if (!loading && hasMore) {
            fetchTickets(false);
        }
    };

    useEffect(() => {
        fetchTickets(true);

        // Real-time Subscription - On change, we refresh the first page
        // Note: For complex pagination, real-time can be tricky.
        // Here we just refresh the whole view to stay simple for now.
        const ticketSubscription = supabase
            .channel('tickets-channel')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, () => {
                fetchTickets(true);
            })
            .subscribe();

        return () => {
            ticketSubscription.unsubscribe();
        };
    }, [userId, userRole]); // Only re-fetch if identity changes. Real-time handles updates.

    const updateTicketStatus = async (id: string, status: TicketStatus, currentUserId: string) => {
        const updates: Record<string, any> = { status, updated_at: new Date().toISOString() };

        if (status === 'IN_PROGRESS' && userRole !== 'SOLICITANTE') {
            updates.technician_id = currentUserId;
        }

        const { error } = await supabase
            .from('tickets')
            .update(updates)
            .eq('id', id);

        if (error) {
            toast.error('Erro ao atualizar status: ' + error.message);
            return { error };
        } else {
            toast.success('Status atualizado!');
            return { success: true };
        }
    };

    const deleteTicket = async (id: string) => {
        const { error } = await supabase
            .from('tickets')
            .delete()
            .eq('id', id);

        if (error) {
            toast.error('Erro ao excluir chamado: ' + error.message);
            return { error };
        } else {
            setTickets(prev => prev.filter(t => t.id !== id));
            toast.success('Chamado excluído!');
            return { success: true };
        }
    };

    const pinTicket = async (id: string, isPinned: boolean, currentUserId: string) => {
        const updates = {
            is_pinned: isPinned,
            pinned_at: isPinned ? new Date().toISOString() : undefined,
            pinned_by: isPinned ? currentUserId : undefined
        };

        const { error } = await supabase
            .from('tickets')
            .update(updates)
            .eq('id', id);

        if (error) {
            toast.error('Erro ao fixar ticket: ' + error.message);
            return { error };
        } else {
            setTickets(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
            toast.success(isPinned ? 'Ticket fixado!' : 'Ticket desafixado!');
            return { success: true };
        }
    };

    return {
        tickets,
        loading,
        hasMore,
        fetchNextPage,
        refreshTickets: () => fetchTickets(true),
        updateTicketStatus,
        deleteTicket,
        pinTicket
    };
};
