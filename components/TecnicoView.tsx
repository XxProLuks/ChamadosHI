import React, { useState, useMemo } from 'react';
import { Ticket, TicketStatus, Priority } from '../types';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import {
  Search,
  MapPin,
  Clock,
  User,
  AlertTriangle,
  CheckCircle2,
  Wrench,
  Filter,
  Columns as LayoutKanban,
  ExternalLink,
  Loader2,
  Pin
} from 'lucide-react';
import SLABadge from './SLABadge';

interface TecnicoViewProps {
  tickets: Ticket[];
  onUpdateStatus: (id: string, status: TicketStatus) => void;
  onViewDetails: (ticket: Ticket) => void;
  onPinTicket?: (id: string, isPinned: boolean) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  hasMore?: boolean;
  onLoadMore?: () => void;
  currentUserId?: string;
}

const statusConfig: Record<TicketStatus, { title: string; color: string; icon: any }> = {
  TODO: { title: 'A Fazer', color: 'bg-slate-500', icon: Clock },
  IN_PROGRESS: { title: 'Em Andamento', color: 'bg-blue-600', icon: Wrench },
  WAITING: { title: 'Aguardando', color: 'bg-amber-500', icon: Clock },
  DONE: { title: 'Concluído', color: 'bg-green-500', icon: CheckCircle2 }
};

const priorityConfig: Record<Priority, { color: string; label: string }> = {
  LOW: { color: 'bg-emerald-100 text-emerald-700', label: 'Baixa' },
  MEDIUM: { color: 'bg-blue-100 text-blue-700', label: 'Média' },
  HIGH: { color: 'bg-orange-100 text-orange-700', label: 'Alta' },
  CRITICAL: { color: 'bg-rose-100 text-rose-700', label: 'Crítica' }
};

const TecnicoView: React.FC<TecnicoViewProps> = ({ tickets, onUpdateStatus, onViewDetails, onPinTicket, searchQuery, onSearchChange, hasMore, onLoadMore, currentUserId }) => {
  const [showMyOnly, setShowMyOnly] = useState(false);

  const filteredTickets = useMemo(() => {
    let result = tickets;

    if (showMyOnly && currentUserId) {
      result = result.filter(t => t.technician_id === currentUserId);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(t =>
        (t.title || '').toLowerCase().includes(query) ||
        (t.sector_name || '').toLowerCase().includes(query) ||
        (t.location || '').toLowerCase().includes(query) ||
        (t.id || '').toLowerCase().includes(query) ||
        (t.requester_name || '').toLowerCase().includes(query)
      );
    }

    // Sort: pinned first, then by created_at
    result = [...result].sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return result;
  }, [tickets, searchQuery, showMyOnly, currentUserId]);

  const onDragEnd = (result: DropResult) => {
    const { destination, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === result.source.droppableId) return;

    onUpdateStatus(draggableId, destination.droppableId as TicketStatus);
  };

  // Metrics
  const metrics = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const completedToday = tickets.filter(t => {
      if (t.status !== 'DONE') return false;
      const updatedDate = new Date(t.updated_at);
      updatedDate.setHours(0, 0, 0, 0);
      return updatedDate.getTime() === today.getTime();
    }).length;

    return {
      pending: tickets.filter(t => t.status === 'TODO').length,
      inProgress: tickets.filter(t => t.status === 'IN_PROGRESS').length,
      completedToday
    };
  }, [tickets]);

  return (
    <div className="h-full flex flex-col p-4 sm:p-8 animate-in fade-in duration-700">
      <div className="max-w-[1600px] mx-auto w-full flex flex-col h-full gap-8">

        {/* Metrics Section */}
        <div className="grid grid-cols-3 gap-6">
          {[
            { label: 'Aguardando', value: metrics.pending, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50' },
            { label: 'Em Execução', value: metrics.inProgress, icon: Wrench, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Feitos Hoje', value: metrics.completedToday, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' }
          ].map((m, i) => (
            <div key={i} className="bg-white rounded-[2rem] p-6 shadow-xl shadow-slate-200/50 border border-slate-50 flex items-center gap-5">
              <div className={`w-14 h-14 rounded-2xl ${m.bg} flex items-center justify-center ${m.color}`}>
                <m.icon size={28} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{m.label}</p>
                <p className="text-3xl font-black text-slate-800 leading-none">{m.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters & Actions */}
        <div className="flex flex-col lg:flex-row gap-6 justify-between items-center">
          <div className="w-full lg:max-w-md relative group">
            <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
              <Search size={20} className="text-slate-400 group-focus-within:text-blue-500" />
            </div>
            <input
              className="block w-full pl-14 pr-12 py-4 bg-white border border-slate-100 rounded-3xl text-slate-900 placeholder-slate-400 shadow-xl shadow-slate-200/30 focus:ring-4 focus:ring-blue-50 focus:border-blue-400 transition-all outline-none font-medium"
              placeholder="Filtre por chamado, setor, ID ou solicitante..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>

          <div className="flex gap-4 w-full lg:w-auto overflow-x-auto pb-2 no-scrollbar">
            <button
              onClick={() => setShowMyOnly(!showMyOnly)}
              className={`flex items-center gap-2.5 h-12 px-6 rounded-2xl text-xs font-black transition-all ${showMyOnly ? 'bg-blue-600 text-white shadow-xl shadow-blue-200' : 'bg-white text-slate-500 border border-slate-200 hover:border-blue-300 hover:text-blue-600'}`}
            >
              <User size={18} />
              MEUS CHAMADOS
            </button>
            <div className="flex items-center gap-2.5 h-12 px-6 rounded-2xl text-xs font-black bg-blue-600 text-white shadow-xl shadow-blue-200">
              <LayoutKanban size={18} />
              PAINEL KANBAN
            </div>
          </div>
        </div>

        {/* Drag and Drop Kanban Board */}
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex flex-1 gap-8 overflow-x-auto pb-8 no-scrollbar min-h-[600px]">
            {(['TODO', 'IN_PROGRESS', 'WAITING', 'DONE'] as TicketStatus[]).map(status => (
              <Droppable droppableId={status} key={status}>
                {(provided, snapshot) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className={`flex flex-col w-[380px] min-w-[340px] rounded-[3rem] p-4 transition-colors duration-300 ${snapshot.isDraggingOver ? 'bg-blue-50/50' : 'bg-slate-100/50'}`}
                  >
                    {/* Column Header */}
                    <div className="px-4 py-6 mb-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${statusConfig[status].color}`} />
                        <h3 className="font-black text-slate-800 text-lg tracking-tight uppercase">{statusConfig[status].title}</h3>
                      </div>
                      <span className="bg-white px-3 py-1 rounded-full text-xs font-black text-slate-400 shadow-sm border border-slate-100">
                        {filteredTickets.filter(t => t.status === status).length}
                      </span>
                    </div>

                    {/* Cards Container */}
                    <div className="flex-1 space-y-5">
                      {filteredTickets.filter(t => t.status === status).map((ticket, index) => (
                        <React.Fragment key={ticket.id}>
                          <Draggable draggableId={ticket.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                onClick={() => onViewDetails(ticket)}
                                className={`group bg-white p-6 rounded-[2rem] shadow-xl shadow-slate-200/40 border-2 transition-all cursor-grab active:cursor-grabbing ${snapshot.isDragging ? 'rotate-2 scale-105 border-blue-400 shadow-2xl z-50' : 'border-transparent hover:border-blue-100'}`}
                              >
                                <div className="flex justify-between items-start mb-5">
                                  <div className="flex flex-wrap gap-2">
                                    {ticket.is_pinned && (
                                      <span className="px-3 py-1 rounded-xl bg-amber-100 text-amber-700 text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                                        <Pin size={10} /> Fixado
                                      </span>
                                    )}
                                    <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest ${priorityConfig[ticket.priority].color}`}>
                                      {priorityConfig[ticket.priority].label}
                                    </span>
                                    {ticket.is_critical && (
                                      <span className="px-3 py-1 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest animate-pulse">
                                        CRÍTICO
                                      </span>
                                    )}
                                    <SLABadge deadline={ticket.sla_deadline} ticketStatus={ticket.status} />
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {onPinTicket && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onPinTicket(ticket.id, !ticket.is_pinned);
                                        }}
                                        className={`p-2 rounded-xl transition-all ${ticket.is_pinned ? 'bg-amber-100 text-amber-600' : 'hover:bg-slate-100 text-slate-300 hover:text-slate-500'}`}
                                        title={ticket.is_pinned ? 'Desafixar' : 'Fixar'}
                                      >
                                        <Pin size={14} />
                                      </button>
                                    )}
                                    <span className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">
                                      #{ticket.id.slice(0, 5)}
                                    </span>
                                  </div>
                                </div>

                                <h4 className="text-xl font-black text-slate-800 leading-tight mb-5 group-hover:text-blue-600 transition-colors">
                                  {ticket.title}
                                </h4>

                                <div className="space-y-3 mb-6">
                                  <div className="flex items-center gap-2.5 text-slate-500 font-bold text-sm">
                                    <MapPin size={16} className="text-slate-300" />
                                    <span>{ticket.sector_name || 'Geral'} • {ticket.location}</span>
                                  </div>
                                  <div className="flex items-center gap-2.5 text-slate-400 font-bold text-xs uppercase tracking-wider">
                                    <User size={16} className="text-slate-200" />
                                    <span>{ticket.requester_name || 'Solicitante'}</span>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between pt-5 border-t border-slate-50">
                                  <div className="flex items-center gap-2">
                                    {ticket.technician_avatar ? (
                                      <img src={ticket.technician_avatar} className="w-8 h-8 rounded-xl object-cover ring-2 ring-white shadow-sm" alt="Tech" />
                                    ) : (
                                      <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                                        <User size={16} />
                                      </div>
                                    )}
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{ticket.technician_name?.split(' ')[0] || 'Aguardando'}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 text-blue-500 opacity-0 group-hover:opacity-100 transition-all font-black text-[10px] uppercase">
                                    Detalhes <ExternalLink size={14} />
                                  </div>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        </React.Fragment>
                      ))}
                      {provided.placeholder}
                      {filteredTickets.filter(t => t.status === status).length === 0 && (
                        <div className="h-40 flex flex-col items-center justify-center border-4 border-dashed border-slate-200/50 rounded-[2.5rem] opacity-50">
                          <Clock size={32} className="text-slate-300 mb-2" />
                          <p className="text-slate-400 text-xs font-black uppercase tracking-widest text-center px-4">Coluna Vazia</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </Droppable>
            ))}
          </div>
        </DragDropContext>

        {hasMore && (
          <div className="flex justify-center py-8">
            <button
              onClick={onLoadMore}
              className="group flex items-center gap-3 px-10 py-5 bg-white border-2 border-blue-50 text-blue-600 font-black text-xs uppercase tracking-widest rounded-[2rem] shadow-2xl shadow-blue-100/50 hover:bg-blue-600 hover:text-white hover:border-blue-600 hover:-translate-y-1 transition-all duration-300"
            >
              <Loader2 size={18} className="animate-spin group-hover:text-white" />
              <span>Ver Mais Chamados</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TecnicoView;
