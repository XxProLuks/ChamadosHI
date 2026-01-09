import React, { useState } from 'react';
import { Ticket } from '../types';
import TicketChat from './TicketChat';
import TicketHistory from './TicketHistory';
import TicketRating from './TicketRating';
import {
    X,
    MapPin,
    Clock,
    User,
    AlertCircle,
    CheckCircle2,
    Wrench,
    Info,
    Calendar,
    MessageSquare,
    Zap,
    PlayCircle,
    Trash2,
    Loader2,
    FileDown
} from 'lucide-react';

interface TicketDetailModalProps {
    ticket: Ticket;
    onClose: () => void;
    onUpdateStatus?: (id: string, status: 'TODO' | 'IN_PROGRESS' | 'DONE') => void;
    onDelete?: (id: string) => void;
    isRequester?: boolean;
    currentUserId?: string;
    currentUserName?: string;
    currentUserRole?: string;
}

const priorityConfig = {
    LOW: { label: 'Baixa', color: 'bg-emerald-100 text-emerald-700', icon: Zap },
    MEDIUM: { label: 'Média', color: 'bg-blue-100 text-blue-700', icon: Info },
    HIGH: { label: 'Alta', color: 'bg-orange-100 text-orange-700', icon: AlertCircle },
    CRITICAL: { label: 'Crítica', color: 'bg-rose-100 text-rose-700', icon: AlertCircle }
};

const statusConfig = {
    TODO: { label: 'Aguardando', color: 'bg-amber-100 text-amber-700', icon: Clock },
    IN_PROGRESS: { label: 'Em Atendimento', color: 'bg-blue-100 text-blue-700', icon: Wrench },
    DONE: { label: 'Concluído', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 }
};

const TicketDetailModal: React.FC<TicketDetailModalProps> = ({
    ticket,
    onClose,
    onUpdateStatus,
    onDelete,
    isRequester = false,
    currentUserId,
    currentUserName,
    currentUserRole
}) => {
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const priority = priorityConfig[ticket.priority];
    const status = statusConfig[ticket.status];

    const handleDelete = async () => {
        if (!onDelete) return;
        setDeleting(true);
        await onDelete(ticket.id);
        onClose();
    };

    const handleExportPDF = () => {
        const content = `
CHAMADO #${ticket.id.slice(0, 8)}
========================

Título: ${ticket.title}
Status: ${status.label}
Prioridade: ${priority.label}
Setor: ${ticket.sector_name || 'Geral'}
Local: ${ticket.location}
Solicitante: ${ticket.requester_name || 'Usuário'}
Técnico: ${ticket.technician_name || 'Não atribuído'}

Aberto em: ${new Date(ticket.created_at).toLocaleString('pt-BR')}
Última atualização: ${new Date(ticket.updated_at).toLocaleString('pt-BR')}

Descrição:
${ticket.description || 'Sem descrição'}

========================
Hospital de Ilhéus - Sistema de Chamados
        `.trim();

        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chamado-${ticket.id.slice(0, 8)}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-slate-900/80 backdrop-blur-md transition-opacity animate-in fade-in duration-500"
                onClick={onClose}
            ></div>

            <div className={`relative w-full max-w-2xl bg-white rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh] ${ticket.is_critical ? 'ring-4 ring-rose-500/20' : ''}`}>

                {/* Header Section */}
                <div className={`flex items-center justify-between px-10 py-8 border-b border-slate-50 ${ticket.is_critical ? 'bg-rose-50/50' : 'bg-slate-50/50'}`}>
                    <div className="flex items-center gap-4">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${ticket.is_critical ? 'bg-rose-600 text-white' : 'bg-blue-600 text-white'} shadow-xl`}>
                            {ticket.is_critical ? <AlertCircle size={32} /> : <Zap size={32} />}
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-slate-800 tracking-tight">Detalhes do Chamado</h3>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white px-2 py-0.5 rounded-lg border border-slate-100">
                                    ID: #{ticket.id.slice(0, 8)}
                                </span>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:bg-white hover:text-slate-600 transition-all shadow-sm"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto px-10 py-8 space-y-8 no-scrollbar">
                    {/* Main Info Card */}
                    <div>
                        <h4 className="text-3xl font-black text-slate-800 leading-tight mb-4">{ticket.title}</h4>
                        <div className="flex flex-wrap gap-2.5">
                            <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest ${status.color}`}>
                                <status.icon size={14} />
                                {status.label}
                            </span>
                            <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest ${priority.color}`}>
                                <priority.icon size={14} />
                                {priority.label}
                            </span>
                        </div>
                    </div>

                    {/* Location & Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                            { label: 'Setor', value: ticket.sector_name || 'Geral', icon: MapPin, color: 'text-blue-500', bg: 'bg-blue-50' },
                            ...(ticket.status === 'DONE' ? [{
                                label: 'Fechado em',
                                value: new Date(ticket.updated_at).toLocaleString('pt-BR'),
                                icon: CheckCircle2,
                                color: 'text-emerald-500',
                                bg: 'bg-emerald-50'
                            }] : []),
                            { label: 'Solicitante', value: ticket.requester_name || 'Usuário', icon: User, color: 'text-emerald-500', bg: 'bg-emerald-50' },
                            { label: 'Aberto em', value: new Date(ticket.created_at).toLocaleString('pt-BR'), icon: Calendar, color: 'text-amber-500', bg: 'bg-amber-50' },
                        ].map((item, idx) => (
                            <div key={idx} className={`${item.bg} rounded-[2rem] p-5 border border-white shadow-sm flex items-center gap-4`}>
                                <div className={`w-10 h-10 rounded-xl bg-white flex items-center justify-center ${item.color} shadow-sm border border-slate-50`}>
                                    <item.icon size={20} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{item.label}</p>
                                    <p className="text-sm font-black text-slate-700 leading-none">{item.value}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Description Section */}
                    {ticket.description && (
                        <div className="bg-slate-50/50 rounded-[2.5rem] p-8 border border-white shadow-inner relative">
                            <div className="absolute top-0 right-10 -translate-y-1/2 bg-white px-4 py-1.5 rounded-full border border-slate-100 shadow-sm flex items-center gap-2 text-slate-400">
                                <MessageSquare size={14} />
                                <span className="text-[10px] font-black uppercase tracking-widest">Observações</span>
                            </div>
                            <p className="text-lg font-medium text-slate-600 leading-relaxed italic">
                                "{ticket.description}"
                            </p>
                        </div>
                    )}

                    {/* Attachment Section */}
                    {((ticket.image_urls && ticket.image_urls.length > 0) || ticket.image_url) && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between px-4">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Evidências Anexadas</label>
                                <span className="text-[10px] font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">
                                    {ticket.image_urls?.length || 1} Foto(s)
                                </span>
                            </div>
                            <div className={`grid gap-4 ${(ticket.image_urls?.length || 1) === 1
                                ? 'grid-cols-1'
                                : (ticket.image_urls?.length || 1) === 2
                                    ? 'grid-cols-2'
                                    : 'grid-cols-2 lg:grid-cols-3'
                                }`}>
                                {(ticket.image_urls && ticket.image_urls.length > 0 ? ticket.image_urls : [ticket.image_url!]).map((url, i) => (
                                    <div key={i} className="rounded-[2.5rem] overflow-hidden border-4 border-white shadow-xl group ring-1 ring-slate-100 aspect-square">
                                        <img
                                            src={url}
                                            alt={`Anexo ${i + 1}`}
                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 cursor-pointer"
                                            onClick={() => window.open(url, '_blank')}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Technician Status Info */}
                    {(ticket.technician_name || ticket.status === 'IN_PROGRESS') && (
                        <div className="bg-blue-600/5 rounded-[2.5rem] p-8 border border-blue-100/30 flex items-center gap-6">
                            <div className="relative">
                                {ticket.technician_avatar ? (
                                    <img
                                        src={ticket.technician_avatar}
                                        alt={ticket.technician_name}
                                        className="w-16 h-16 rounded-2xl object-cover ring-4 ring-white shadow-xl"
                                    />
                                ) : (
                                    <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600 ring-4 ring-white shadow-xl">
                                        <Wrench size={32} />
                                    </div>
                                )}
                                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-4 border-white shadow-lg" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Responsável Técnico</p>
                                <p className="text-xl font-black text-slate-800">{ticket.technician_name || 'Atribuindo...'}</p>
                                <p className="text-xs font-bold text-slate-400 mt-1">
                                    {ticket.status === 'IN_PROGRESS' ? 'Em deslocamento para o local' : 'Atendimento finalizado com sucesso'}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Chat Section */}
                    {currentUserId && currentUserName && currentUserRole && (
                        <TicketChat
                            ticketId={ticket.id}
                            currentUserId={currentUserId}
                            currentUserName={currentUserName}
                            currentUserRole={currentUserRole}
                        />
                    )}

                    {/* History Section */}
                    <TicketHistory ticketId={ticket.id} />

                    {/* Rating Section (Visible to requester when DONE) */}
                    {ticket.status === 'DONE' && isRequester && (
                        <TicketRating
                            ticketId={ticket.id}
                            existingRating={ticket.rating}
                            existingComment={ticket.rating_comment}
                            onRatingSubmit={() => {
                                // Opcional: atualizar estado local se necessário
                            }}
                        />
                    )}
                </div>

                {/* Footer with Big Action Buttons */}
                {!isRequester && onUpdateStatus && (
                    <div className="p-10 bg-slate-50 border-t border-slate-100 flex gap-4">
                        {ticket.status === 'TODO' && (
                            <button
                                onClick={() => onUpdateStatus(ticket.id, 'IN_PROGRESS')}
                                className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white font-black text-sm uppercase tracking-widest py-6 px-10 rounded-[1.5rem] shadow-2xl shadow-blue-200 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
                            >
                                <PlayCircle size={22} />
                                Iniciar Atendimento Agora
                            </button>
                        )}
                        {ticket.status === 'IN_PROGRESS' && (
                            <button
                                onClick={() => onUpdateStatus(ticket.id, 'DONE')}
                                className="flex-[2] bg-emerald-500 hover:bg-emerald-600 text-white font-black text-sm uppercase tracking-widest py-6 px-10 rounded-[1.5rem] shadow-2xl shadow-emerald-200 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
                            >
                                <CheckCircle2 size={22} />
                                Finalizar Chamado Técnica
                            </button>
                        )}
                        {ticket.status === 'DONE' && (
                            <div className="flex-1 bg-emerald-50 text-emerald-600 font-extrabold py-6 rounded-[1.5rem] border border-emerald-100 flex items-center justify-center gap-3 uppercase text-xs tracking-widest">
                                <CheckCircle2 size={20} />
                                Atendimento Concluído
                            </div>
                        )}
                        <button
                            onClick={onClose}
                            className="flex-1 bg-white text-slate-500 font-black text-sm uppercase tracking-widest py-6 rounded-[1.5rem] shadow-sm hover:bg-slate-100 transition-all"
                        >
                            Fechar
                        </button>
                        {onDelete && ticket.status === 'TODO' && currentUserId === ticket.requester_id && (
                            showDeleteConfirm ? (
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleDelete}
                                        disabled={deleting}
                                        className="px-6 py-6 bg-rose-600 text-white font-black text-sm uppercase tracking-widest rounded-[1.5rem] hover:bg-rose-700 transition-all flex items-center gap-2"
                                    >
                                        {deleting ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                                        Confirmar
                                    </button>
                                    <button
                                        onClick={() => setShowDeleteConfirm(false)}
                                        className="px-6 py-6 bg-slate-200 text-slate-600 font-black text-sm uppercase tracking-widest rounded-[1.5rem] hover:bg-slate-300 transition-all"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setShowDeleteConfirm(true)}
                                    className="px-6 py-6 bg-rose-50 text-rose-600 font-black text-sm uppercase tracking-widest rounded-[1.5rem] hover:bg-rose-100 transition-all flex items-center gap-2"
                                >
                                    <Trash2 size={18} />
                                    Excluir
                                </button>
                            )
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default TicketDetailModal;
