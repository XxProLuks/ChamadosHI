import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { History, Clock, CheckCircle2, Wrench, ArrowRight, Loader2 } from 'lucide-react';

interface HistoryEntry {
    id: string;
    ticket_id: string;
    user_id: string;
    action: string;
    old_value: string | null;
    new_value: string | null;
    created_at: string;
    user?: {
        full_name: string;
    };
}

interface TicketHistoryProps {
    ticketId: string;
}

const statusLabels: Record<string, { label: string; color: string; icon: any }> = {
    'TODO': { label: 'A Fazer', color: 'bg-amber-100 text-amber-700', icon: Clock },
    'IN_PROGRESS': { label: 'Em Andamento', color: 'bg-blue-100 text-blue-700', icon: Wrench },
    'DONE': { label: 'Concluído', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 }
};

const TicketHistory: React.FC<TicketHistoryProps> = ({ ticketId }) => {
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [isExpanded, setIsExpanded] = useState(false);

    useEffect(() => {
        fetchHistory();
    }, [ticketId]);

    const fetchHistory = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('ticket_history')
            .select(`*, user:profiles!user_id(full_name)`)
            .eq('ticket_id', ticketId)
            .order('created_at', { ascending: false });

        if (data) {
            setHistory(data);
        }
        setLoading(false);
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleString('pt-BR', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getActionDescription = (entry: HistoryEntry) => {
        if (entry.action === 'STATUS_CHANGE') {
            const oldStatus = statusLabels[entry.old_value || ''];
            const newStatus = statusLabels[entry.new_value || ''];
            return (
                <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${oldStatus?.color || 'bg-slate-100 text-slate-600'}`}>
                        {oldStatus?.label || entry.old_value}
                    </span>
                    <ArrowRight size={14} className="text-slate-400" />
                    <span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${newStatus?.color || 'bg-slate-100 text-slate-600'}`}>
                        {newStatus?.label || entry.new_value}
                    </span>
                </div>
            );
        }
        return <span>{entry.action}</span>;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 size={24} className="animate-spin text-slate-400" />
            </div>
        );
    }

    if (history.length === 0) {
        return null;
    }

    return (
        <div className="bg-slate-50/50 dark:bg-slate-800/50 rounded-[2rem] border border-slate-100 dark:border-slate-700 overflow-hidden">
            {/* Header */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full px-6 py-4 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
                <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
                    <History size={20} />
                </div>
                <div className="flex-1 text-left">
                    <h4 className="font-black text-slate-800 dark:text-white text-sm">Histórico de Alterações</h4>
                    <p className="text-xs text-slate-400">{history.length} alterações registradas</p>
                </div>
                <span className={`text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                    ▼
                </span>
            </button>

            {/* History List */}
            {isExpanded && (
                <div className="p-4 space-y-3 max-h-64 overflow-y-auto no-scrollbar">
                    {history.map((entry) => (
                        <div
                            key={entry.id}
                            className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">
                                        {entry.user?.full_name || 'Sistema'} alterou o status
                                    </p>
                                    {getActionDescription(entry)}
                                </div>
                                <span className="text-[10px] font-medium text-slate-400 whitespace-nowrap">
                                    {formatDate(entry.created_at)}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default TicketHistory;
