import React, { useState } from 'react';
import { Ticket, TicketStatus } from '../types';
import { Clock, CheckCircle2, Wrench, MapPin, ChevronRight, Inbox, AlertCircle, Receipt } from 'lucide-react';
import ProgressBar from './ProgressBar';
import SLABadge from './SLABadge';

interface MyTicketsProps {
    tickets: Ticket[];
    onViewDetails: (ticket: Ticket) => void;
    requesterName: string;
    hasMore?: boolean;
    onLoadMore?: () => void;
}

const statusConfig = {
    TODO: { label: 'Aguardando', color: 'bg-amber-100 text-amber-700', icon: Clock },
    IN_PROGRESS: { label: 'Em Atendimento', color: 'bg-blue-100 text-blue-700', icon: Wrench },
    WAITING: { label: 'Aguardando Resposta', color: 'bg-orange-100 text-orange-700', icon: Clock },
    DONE: { label: 'Concluído', color: 'bg-green-100 text-green-700', icon: CheckCircle2 }
};

const MyTickets: React.FC<MyTicketsProps> = ({ tickets, onViewDetails, requesterName, hasMore, onLoadMore }) => {
    const [filter, setFilter] = useState<'all' | TicketStatus>('all');

    // Filter tickets by requester (using requester_name or requester_id if we want more precision, 
    // but for now requesterName is passed from App.tsx session)
    const myTickets = tickets.filter(t => t.requester_name === requesterName);

    const filteredTickets = filter === 'all'
        ? myTickets
        : myTickets.filter(t => t.status === filter);

    const counts = {
        all: myTickets.length,
        TODO: myTickets.filter(t => t.status === 'TODO').length,
        IN_PROGRESS: myTickets.filter(t => t.status === 'IN_PROGRESS').length,
        WAITING: myTickets.filter(t => t.status === 'WAITING').length,
        DONE: myTickets.filter(t => t.status === 'DONE').length
    };

    if (myTickets.length === 0) {
        return null;
    }

    return (
        <div className="w-full mt-8 animate-in slide-in-from-bottom-5 duration-700">
            <div className="flex items-center justify-between mb-6 px-1">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                        <Receipt size={20} />
                    </div>
                    <h3 className="text-lg font-black text-slate-800 tracking-tight">Meus Chamados</h3>
                    <span className="bg-blue-600/10 text-blue-600 text-xs font-black px-2.5 py-1 rounded-full">
                        {myTickets.length}
                    </span>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2.5 mb-6 overflow-x-auto pb-2 no-scrollbar">
                {[
                    { key: 'all', label: 'Todos', count: counts.all },
                    { key: 'TODO', label: 'Aguardando', count: counts.TODO },
                    { key: 'IN_PROGRESS', label: 'Atendimento', count: counts.IN_PROGRESS },
                    { key: 'DONE', label: 'Concluídos', count: counts.DONE }
                ].map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setFilter(tab.key as any)}
                        className={`flex items-center gap-2.5 px-5 py-2.5 rounded-2xl text-xs font-black whitespace-nowrap transition-all duration-300 ${filter === tab.key
                            ? 'bg-blue-600 text-white shadow-xl shadow-blue-200'
                            : 'bg-white border border-slate-100 text-slate-500 hover:border-blue-200 hover:bg-slate-50'
                            }`}
                    >
                        {tab.label}
                        <span className={`px-2 py-0.5 rounded-lg ${filter === tab.key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400'
                            }`}>
                            {tab.count}
                        </span>
                    </button>
                ))}
            </div>

            {/* Tickets List */}
            <div className="grid gap-4">
                {filteredTickets.map(ticket => {
                    const status = statusConfig[ticket.status];
                    const StatusIcon = status.icon;
                    return (
                        <button
                            key={ticket.id}
                            onClick={() => onViewDetails(ticket)}
                            className="w-full bg-white border border-slate-50 rounded-3xl p-5 text-left hover:shadow-2xl hover:shadow-slate-200/50 hover:border-blue-100 hover:-translate-x-1 transition-all duration-300 group relative overflow-hidden"
                        >
                            {/* Accent Line */}
                            <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${ticket.status === 'DONE' ? 'bg-green-500' : ticket.status === 'IN_PROGRESS' ? 'bg-blue-500' : 'bg-amber-500'}`} />

                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-black tracking-wider uppercase ${status.color}`}>
                                            <StatusIcon size={12} />
                                            {status.label}
                                        </span>
                                        {ticket.is_critical && (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-orange-100 text-orange-600 text-[10px] font-black tracking-wider uppercase">
                                                <AlertCircle size={12} />
                                                URGENTE
                                            </span>
                                        )}
                                        <SLABadge deadline={ticket.sla_deadline} ticketStatus={ticket.status} />
                                    </div>
                                    <h4 className="text-lg font-black text-slate-800 truncate group-hover:text-blue-600 transition-colors mb-2">
                                        {ticket.title}
                                    </h4>
                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-400 font-bold">
                                        <span className="flex items-center gap-1.5">
                                            <MapPin size={14} className="text-slate-300" />
                                            {ticket.sector_name || 'Geral'} • {ticket.location}
                                        </span>
                                        <span className="flex items-center gap-1.5">
                                            <Clock size={14} className="text-slate-300" />
                                            {new Date(ticket.created_at).toLocaleDateString('pt-BR')}
                                        </span>
                                    </div>
                                    <div className="mt-3">
                                        <ProgressBar status={ticket.status} />
                                    </div>
                                </div>
                                <div className="flex items-center self-center text-slate-300 group-hover:text-blue-500 transition-all group-hover:translate-x-1">
                                    <ChevronRight size={24} strokeWidth={3} />
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>

            {hasMore && (
                <div className="flex justify-center mt-8">
                    <button
                        onClick={onLoadMore}
                        className="group flex items-center gap-3 px-8 py-4 bg-white border-2 border-blue-50 text-blue-600 font-black text-xs uppercase tracking-widest rounded-3xl shadow-xl shadow-blue-100/50 hover:bg-blue-600 hover:text-white hover:border-blue-600 hover:-translate-y-1 transition-all duration-300"
                    >
                        <span>Carregar Mais Chamados</span>
                        <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
            )}
        </div>
    );
};

export default MyTickets;
