import React, { useState, useEffect, useMemo, useCallback } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { GlobalAlert } from '../types';
import { ALERT_TEMPLATES, AlertTemplate, fillTemplatePlaceholders } from '../lib/alertTemplates';
import {
    X, AlertTriangle, Info, AlertCircle, Trash2, Send, Loader2,
    Megaphone, History, Clock, Eye, BarChart3, Sparkles, RefreshCw,
    TrendingUp, Users
} from 'lucide-react';

interface GlobalAlertManagerProps {
    onClose: () => void;
    currentUserId: string;
}

type TabType = 'create' | 'active' | 'history' | 'stats';

const GlobalAlertManager: React.FC<GlobalAlertManagerProps> = ({ onClose, currentUserId }) => {
    const [activeTab, setActiveTab] = useState<TabType>('create');
    const [alerts, setAlerts] = useState<GlobalAlert[]>([]);
    const [expiredAlerts, setExpiredAlerts] = useState<GlobalAlert[]>([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [message, setMessage] = useState('');
    const [type, setType] = useState<'INFO' | 'WARNING' | 'CRITICAL'>('INFO');
    const [selectedTemplate, setSelectedTemplate] = useState<AlertTemplate | null>(null);
    const [templateValues, setTemplateValues] = useState<Record<string, string>>({});
    const [showPreview, setShowPreview] = useState(false);
    const [duration, setDuration] = useState(8); // hours

    useEffect(() => {
        fetchAlerts();
        fetchExpiredAlerts();
    }, []);

    const fetchAlerts = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('global_alerts')
                .select('*')
                .gt('expires_at', new Date().toISOString())
                .order('created_at', { ascending: false });

            if (error) throw error;
            if (data) setAlerts(data);
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : 'Erro desconhecido';
            console.error('Erro ao buscar alertas:', msg);
            toast.error('Erro ao buscar alertas: ' + msg);
        } finally {
            setLoading(false);
        }
    };

    const fetchExpiredAlerts = async () => {
        try {
            const { data, error } = await supabase
                .from('global_alerts')
                .select('*')
                .lte('expires_at', new Date().toISOString())
                .order('created_at', { ascending: false })
                .limit(20);

            if (error) throw error;
            if (data) setExpiredAlerts(data);
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : 'Erro desconhecido';
            console.error('Erro ao buscar alertas expirados:', msg);
        }
    };

    const handleTemplateSelect = (template: AlertTemplate) => {
        setSelectedTemplate(template);
        setMessage(template.message);
        setType(template.type);
        setDuration(template.defaultDuration);
        setTemplateValues({});
    };

    const handleCreateAlert = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim() || sending) return;

        setSending(true);

        try {
            let finalMessage = message.trim();
            if (selectedTemplate && selectedTemplate.placeholders) {
                finalMessage = fillTemplatePlaceholders(selectedTemplate, templateValues);
            }

            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + duration);

            const { error } = await supabase
                .from('global_alerts')
                .insert([{
                    message: finalMessage,
                    type,
                    created_by: currentUserId,
                    expires_at: expiresAt.toISOString()
                }])
                .select();

            if (error) throw error;

            toast.success('Alerta disparado com sucesso!');
            setMessage('');
            setSelectedTemplate(null);
            setTemplateValues({});
            fetchAlerts();
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : 'Erro desconhecido';
            toast.error('Erro ao criar alerta: ' + msg);
        } finally {
            setSending(false);
        }
    };

    const handleDeleteAlert = useCallback(async (id: string) => {
        try {
            const { error } = await supabase
                .from('global_alerts')
                .delete()
                .eq('id', id);

            if (error) throw error;
            toast.success('Alerta removido');
            fetchAlerts();
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : 'Erro desconhecido';
            toast.error('Erro ao remover alerta: ' + msg);
        }
    }, []);

    const handleRenewAlert = (alert: GlobalAlert) => {
        setMessage(alert.message);
        setType(alert.type);
        setActiveTab('create');
        toast.success('Alerta copiado para edição');
    };

    const getPreviewMessage = () => {
        if (selectedTemplate && selectedTemplate.placeholders) {
            return fillTemplatePlaceholders(selectedTemplate, templateValues);
        }
        return message;
    };

    // Memoized stats calculation for performance
    const stats = useMemo(() => ({
        totalAlerts: alerts.length + expiredAlerts.length,
        activeAlerts: alerts.length,
        totalViews: alerts.reduce((sum, a) => sum + (a.view_count || 0), 0),
        totalDismisses: alerts.reduce((sum, a) => sum + (a.dismiss_count || 0), 0),
        avgEngagement: alerts.length > 0
            ? ((alerts.reduce((sum, a) => sum + (a.view_count || 0), 0) / alerts.length) * 100).toFixed(1)
            : '0'
    }), [alerts, expiredAlerts]);

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="px-8 py-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-xl flex items-center justify-center shadow-lg">
                            <Megaphone size={28} />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black tracking-tight">Alertas Globais</h3>
                            <p className="text-xs font-bold text-white/70 uppercase tracking-widest">Centro de Comando</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-all">
                        <X size={24} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-6">
                    {[
                        { id: 'create', label: 'Criar', icon: Sparkles },
                        { id: 'active', label: 'Ativos', icon: Megaphone, count: alerts.length },
                        { id: 'history', label: 'Histórico', icon: History },
                        { id: 'stats', label: 'Estatísticas', icon: BarChart3 }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as TabType)}
                            className={`flex items-center gap-2 px-6 py-4 font-black text-sm uppercase tracking-wider border-b-4 transition-all ${activeTab === tab.id
                                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                                }`}
                        >
                            <tab.icon size={18} />
                            {tab.label}
                            {tab.count !== undefined && tab.count > 0 && (
                                <span className="ml-1 px-2 py-0.5 bg-blue-600 text-white text-[10px] rounded-full">
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar">

                    {/* CREATE TAB */}
                    {activeTab === 'create' && (
                        <div className="space-y-6">
                            {/* Templates Grid */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Templates Prontos</label>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    {ALERT_TEMPLATES.map(template => (
                                        <button
                                            key={template.id}
                                            onClick={() => handleTemplateSelect(template)}
                                            className={`p-4 rounded-2xl border-2 transition-all text-left ${selectedTemplate?.id === template.id
                                                ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                                                : 'border-slate-200 dark:border-slate-700 hover:border-blue-300 bg-white dark:bg-slate-800'
                                                }`}
                                        >
                                            <div className="text-2xl mb-2">{template.icon}</div>
                                            <div className="text-xs font-black text-slate-700 dark:text-slate-200">
                                                {template.name.replace(/^[^\s]+ /, '')}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Form */}
                            <form onSubmit={handleCreateAlert} className="space-y-6 bg-blue-50/30 dark:bg-blue-900/10 p-6 rounded-[2rem] border border-blue-100/50 dark:border-blue-900/20">
                                {/* Template Placeholders */}
                                {selectedTemplate && selectedTemplate.placeholders && selectedTemplate.placeholders.length > 0 && (
                                    <div className="grid grid-cols-2 gap-4">
                                        {selectedTemplate.placeholders.map(placeholder => (
                                            <div key={placeholder} className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                                    {placeholder}
                                                </label>
                                                <input
                                                    type="text"
                                                    value={templateValues[placeholder] || ''}
                                                    onChange={(e) => setTemplateValues(prev => ({ ...prev, [placeholder]: e.target.value }))}
                                                    placeholder={`Digite ${placeholder.toLowerCase()}`}
                                                    className="w-full px-4 py-3 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl text-sm text-slate-700 dark:text-white focus:border-blue-400 outline-none"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Message */}
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mensagem do Alerta</label>
                                    <textarea
                                        required
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        placeholder="Ex: Servidor de Imagens passará por manutenção às 18h..."
                                        className="w-full px-5 py-4 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl text-slate-700 dark:text-white placeholder-slate-400 focus:border-blue-400 outline-none transition-all font-medium h-24 no-scrollbar"
                                    />
                                </div>

                                <div className="flex gap-4">
                                    {/* Type Selector */}
                                    <div className="flex-1 space-y-3">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Gravidade</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {[
                                                { val: 'INFO', label: 'Info', color: 'text-blue-500', bg: 'bg-blue-50', icon: Info },
                                                { val: 'WARNING', label: 'Atenção', color: 'text-amber-500', bg: 'bg-amber-50', icon: AlertTriangle },
                                                { val: 'CRITICAL', label: 'Crítico', color: 'text-rose-500', bg: 'bg-rose-50', icon: AlertCircle },
                                            ].map((t) => (
                                                <button
                                                    key={t.val}
                                                    type="button"
                                                    onClick={() => setType(t.val as any)}
                                                    className={`flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all ${type === t.val
                                                        ? `${t.bg} border-current ${t.color} scale-105 shadow-md`
                                                        : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-400'
                                                        }`}
                                                >
                                                    <t.icon size={18} />
                                                    <span className="text-[10px] font-bold">{t.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Duration */}
                                    <div className="w-32 space-y-3">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Duração (h)</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="168"
                                            value={duration}
                                            onChange={(e) => setDuration(parseInt(e.target.value) || 8)}
                                            className="w-full px-4 py-3 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl text-center font-black focus:border-blue-400 outline-none"
                                        />
                                    </div>
                                </div>

                                {/* Preview & Submit */}
                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowPreview(!showPreview)}
                                        className="px-6 py-4 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl font-black text-xs uppercase flex items-center gap-2 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
                                    >
                                        <Eye size={18} />
                                        {showPreview ? 'Ocultar' : 'Preview'}
                                    </button>
                                    <button
                                        disabled={sending || !message.trim()}
                                        className="flex-1 px-8 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 dark:shadow-blue-900/30 disabled:opacity-50"
                                    >
                                        {sending ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                                        Disparar Alerta
                                    </button>
                                </div>

                                {/* Live Preview */}
                                {showPreview && (
                                    <div className="p-6 bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-200 dark:border-slate-700">
                                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Preview do Banner</div>
                                        <div className={`flex items-center gap-4 px-6 py-3.5 rounded-2xl ${type === 'CRITICAL'
                                            ? 'bg-rose-600 text-white'
                                            : type === 'WARNING'
                                                ? 'bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-100'
                                                : 'bg-blue-600 text-white'
                                            }`}>
                                            <div className="flex-shrink-0">
                                                {type === 'CRITICAL' ? <AlertCircle size={22} /> :
                                                    type === 'WARNING' ? <AlertTriangle size={22} /> :
                                                        <Megaphone size={22} />}
                                            </div>
                                            <p className="text-sm font-black uppercase tracking-wider flex-1">
                                                {getPreviewMessage() || 'Digite uma mensagem para ver o preview...'}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </form>
                        </div>
                    )}

                    {/* ACTIVE TAB */}
                    {activeTab === 'active' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest">Alertas Ativos</h4>
                                <button onClick={fetchAlerts} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all">
                                    <RefreshCw size={16} className="text-slate-400" />
                                </button>
                            </div>

                            {loading ? (
                                <div className="flex justify-center py-10">
                                    <Loader2 className="animate-spin text-blue-500" size={32} />
                                </div>
                            ) : alerts.length === 0 ? (
                                <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/30 rounded-[2rem] border-2 border-dashed border-slate-100 dark:border-slate-700">
                                    <Megaphone size={32} className="mx-auto text-slate-300 mb-3 opacity-20" />
                                    <p className="text-sm font-bold text-slate-400 italic">Nenhum alerta ativo</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {alerts.map((alert) => (
                                        <div key={alert.id} className="group relative bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all">
                                            <div className="flex gap-4">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${alert.type === 'CRITICAL' ? 'bg-rose-50 text-rose-500' :
                                                    alert.type === 'WARNING' ? 'bg-amber-50 text-amber-500' :
                                                        'bg-blue-50 text-blue-500'
                                                    }`}>
                                                    {alert.type === 'CRITICAL' ? <AlertCircle size={20} /> :
                                                        alert.type === 'WARNING' ? <AlertTriangle size={20} /> :
                                                            <Info size={20} />}
                                                </div>
                                                <div className="flex-1 pr-10">
                                                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200 leading-relaxed">{alert.message}</p>
                                                    <div className="flex items-center gap-4 mt-3">
                                                        <div className="flex items-center gap-1.5">
                                                            <Clock size={12} className="text-slate-400" />
                                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                                {new Date(alert.created_at).toLocaleString('pt-BR')}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5">
                                                            <Eye size={12} className="text-blue-500" />
                                                            <span className="text-[10px] font-black text-blue-500">{alert.view_count || 0}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5">
                                                            <Users size={12} className="text-amber-500" />
                                                            <span className="text-[10px] font-black text-amber-500">{alert.dismiss_count || 0}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleDeleteAlert(alert.id)}
                                                className="absolute top-4 right-4 p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* HISTORY TAB */}
                    {activeTab === 'history' && (
                        <div className="space-y-4">
                            <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest">Alertas Expirados</h4>

                            {expiredAlerts.length === 0 ? (
                                <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/30 rounded-[2rem] border-2 border-dashed border-slate-100 dark:border-slate-700">
                                    <History size={32} className="mx-auto text-slate-300 mb-3 opacity-20" />
                                    <p className="text-sm font-bold text-slate-400 italic">Sem histórico</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {expiredAlerts.map((alert) => (
                                        <div key={alert.id} className="group relative bg-slate-50 dark:bg-slate-800/50 p-5 rounded-3xl border border-slate-200 dark:border-slate-700">
                                            <div className="flex gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0 text-slate-400">
                                                    <History size={20} />
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-sm font-bold text-slate-500 dark:text-slate-400 leading-relaxed">{alert.message}</p>
                                                    <div className="flex items-center gap-2 mt-2">
                                                        <Clock size={12} className="text-slate-400" />
                                                        <span className="text-[10px] font-black text-slate-400">
                                                            Expirou em {new Date(alert.expires_at).toLocaleString('pt-BR')}
                                                        </span>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleRenewAlert(alert)}
                                                    className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all opacity-0 group-hover:opacity-100"
                                                    title="Renovar alerta"
                                                >
                                                    <RefreshCw size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* STATISTICS TAB */}
                    {activeTab === 'stats' && (
                        <div className="space-y-6">
                            <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest">Estatísticas do Sistema</h4>

                            {/* Stats Grid */}
                            <div className="grid grid-cols-2 gap-4">
                                {[
                                    { label: 'Total de Alertas', value: stats.totalAlerts, icon: Megaphone, color: 'blue' },
                                    { label: 'Alertas Ativos', value: stats.activeAlerts, icon: AlertCircle, color: 'green' },
                                    { label: 'Total de Visualizações', value: stats.totalViews, icon: Eye, color: 'purple' },
                                    { label: 'Total Dispensados', value: stats.totalDismisses, icon: Users, color: 'amber' },
                                ].map((stat, i) => (
                                    <div key={i} className={`p-6 rounded-3xl border-2 border-${stat.color}-100 dark:border-${stat.color}-900/30 bg-${stat.color}-50/30 dark:bg-${stat.color}-900/10`}>
                                        <div className="flex items-start justify-between mb-3">
                                            <div className={`w-12 h-12 rounded-2xl bg-${stat.color}-100 dark:bg-${stat.color}-900/30 flex items-center justify-center text-${stat.color}-600 dark:text-${stat.color}-400`}>
                                                <stat.icon size={24} />
                                            </div>
                                            <TrendingUp size={16} className={`text-${stat.color}-500`} />
                                        </div>
                                        <div className="text-3xl font-black text-slate-800 dark:text-white mb-1">{stat.value}</div>
                                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</div>
                                    </div>
                                ))}
                            </div>

                            {/* Engagement Rate */}
                            <div className="p-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-3xl text-white text-center">
                                <div className="text-6xl font-black mb-2">{stats.avgEngagement}%</div>
                                <div className="text-sm font-bold opacity-80 uppercase tracking-widest">Taxa de Engajamento Média</div>
                                <div className="text-xs opacity-60 mt-2">Baseado em visualizações por alerta ativo</div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GlobalAlertManager;
