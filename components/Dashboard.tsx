import React, { useMemo } from 'react';
import { Ticket } from '../types';
import TechnicianWorkload from './TechnicianWorkload';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { TrendingUp, TrendingDown, Activity, PieChart, BarChart3, Clock, CheckCircle2, AlertCircle, AlertTriangle, Star } from 'lucide-react';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend
);

interface DashboardProps {
    tickets: Ticket[];
}

const Dashboard: React.FC<DashboardProps> = ({ tickets }) => {
    // Memoized data processing for performance
    const { statusCounts, priorityCounts, topSectors, criticalSectors, weeklyData, averageRating, resolutionRate } = useMemo(() => {
        // Status counts
        const statusCounts = {
            TODO: tickets.filter(t => t.status === 'TODO').length,
            IN_PROGRESS: tickets.filter(t => t.status === 'IN_PROGRESS').length,
            DONE: tickets.filter(t => t.status === 'DONE').length,
        };

        // Priority counts
        const priorityCounts = {
            LOW: tickets.filter(t => t.priority === 'LOW').length,
            MEDIUM: tickets.filter(t => t.priority === 'MEDIUM').length,
            HIGH: tickets.filter(t => t.priority === 'HIGH').length,
            CRITICAL: tickets.filter(t => t.priority === 'CRITICAL').length,
        };

        // Top Sectors
        const sectorMap: Record<string, number> = {};
        tickets.forEach(t => {
            const s = t.sector_name || 'Geral';
            sectorMap[s] = (sectorMap[s] || 0) + 1;
        });
        const topSectors = Object.entries(sectorMap)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        // Critical Sectors (sectors with HIGH/CRITICAL priority tickets)
        const criticalSectorMap: Record<string, number> = {};
        tickets.filter(t => t.priority === 'HIGH' || t.priority === 'CRITICAL').forEach(t => {
            const s = t.sector_name || 'Geral';
            criticalSectorMap[s] = (criticalSectorMap[s] || 0) + 1;
        });
        const criticalSectors = Object.entries(criticalSectorMap)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3);

        // Weekly Trend
        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

        const thisWeekTickets = tickets.filter(t => new Date(t.created_at) >= oneWeekAgo).length;
        const lastWeekTickets = tickets.filter(t => {
            const d = new Date(t.created_at);
            return d >= twoWeeksAgo && d < oneWeekAgo;
        }).length;

        const weeklyChange = lastWeekTickets > 0
            ? Math.round(((thisWeekTickets - lastWeekTickets) / lastWeekTickets) * 100)
            : thisWeekTickets > 0 ? 100 : 0;

        const weeklyData = { thisWeekTickets, lastWeekTickets, weeklyChange };

        // Average Rating
        const ratedTickets = tickets.filter(t => t.rating && t.rating > 0);
        const averageRating = ratedTickets.length > 0
            ? (ratedTickets.reduce((acc, t) => acc + (t.rating || 0), 0) / ratedTickets.length).toFixed(1)
            : '5.0';

        // Real Resolution Rate
        const totalFinished = tickets.filter(t => t.status === 'DONE').length;
        const resolutionRate = tickets.length > 0
            ? Math.round((totalFinished / tickets.length) * 100)
            : 100;

        return { statusCounts, priorityCounts, topSectors, criticalSectors, weeklyData, averageRating, resolutionRate };
    }, [tickets]);

    // Destructure weekly data for easier access
    const { thisWeekTickets, lastWeekTickets, weeklyChange } = weeklyData;

    const statusData = {
        labels: ['Aguardando', 'Atendimento', 'Concluído'],
        datasets: [{
            data: [statusCounts.TODO, statusCounts.IN_PROGRESS, statusCounts.DONE],
            backgroundColor: ['#f59e0b', '#3b82f6', '#10b981'],
            borderWidth: 0,
        }],
    };

    const priorityData = {
        labels: ['Baixa', 'Média', 'Alta', 'Crítica'],
        datasets: [{
            label: 'Chamados por Prioridade',
            data: [priorityCounts.LOW, priorityCounts.MEDIUM, priorityCounts.HIGH, priorityCounts.CRITICAL],
            backgroundColor: ['#10b981', '#3b82f6', '#f97316', '#e11d48'],
            borderRadius: 12,
        }],
    };

    return (
        <div className="p-8 animate-in fade-in duration-700 space-y-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-3xl font-black text-slate-800 tracking-tight">Painel de Controle</h2>
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-xs mt-1">Análise em tempo real do Hospital</p>
                </div>
                <div className="flex gap-4">
                    {/* Static Filters or Actions can go here */}
                </div>
            </div>

            <TechnicianWorkload tickets={tickets} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Status Doughnut */}
                <div className="bg-white rounded-[3rem] p-10 shadow-xl shadow-slate-200/50 border border-slate-50 flex flex-col items-center">
                    <div className="w-full flex items-center justify-between mb-8">
                        <h3 className="text-lg font-black text-slate-800 flex items-center gap-3">
                            <PieChart className="text-blue-500" /> Distribuição
                        </h3>
                        <span className="bg-slate-50 px-3 py-1 rounded-full text-[10px] font-black text-slate-400">STATUS</span>
                    </div>
                    <div className="w-full max-w-[240px]">
                        <Doughnut
                            data={statusData}
                            options={{
                                cutout: '75%',
                                plugins: { legend: { display: false } }
                            }}
                        />
                    </div>
                    <div className="w-full mt-8 space-y-3">
                        {Object.entries(statusCounts).map(([k, v]) => (
                            <div key={k} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                                <div className="flex items-center gap-3">
                                    <div className={`w-3 h-3 rounded-full ${k === 'TODO' ? 'bg-amber-500' : k === 'IN_PROGRESS' ? 'bg-blue-500' : 'bg-emerald-500'}`} />
                                    <span className="text-sm font-bold text-slate-600 uppercase tracking-widest">{k}</span>
                                </div>
                                <span className="font-black text-slate-800">{v}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Priority Bar Chart */}
                <div className="lg:col-span-2 bg-white rounded-[3rem] p-10 shadow-xl shadow-slate-200/50 border border-slate-50">
                    <div className="w-full flex items-center justify-between mb-10">
                        <h3 className="text-lg font-black text-slate-800 flex items-center gap-3">
                            <BarChart3 className="text-rose-500" /> Prioridades
                        </h3>
                        <div className="flex gap-2">
                            <span className="bg-rose-50 text-rose-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
                                {priorityCounts.CRITICAL} Críticos
                            </span>
                        </div>
                    </div>
                    <div className="h-[300px]">
                        <Bar
                            data={priorityData}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: { legend: { display: false } },
                                scales: {
                                    y: { beginAtZero: true, grid: { display: false }, ticks: { font: { weight: 'bold' } } },
                                    x: { grid: { display: false }, ticks: { font: { weight: 'bold' } } }
                                }
                            }}
                        />
                    </div>
                </div>

                {/* Top Sectors */}
                <div className="bg-white rounded-[3rem] p-10 shadow-xl shadow-slate-200/50 border border-slate-50">
                    <h3 className="text-lg font-black text-slate-800 flex items-center gap-3 mb-8">
                        <TrendingUp className="text-emerald-500" /> Top Setores
                    </h3>
                    <div className="space-y-4">
                        {topSectors.map(([name, count], idx) => (
                            <div key={idx} className="group relative p-6 bg-slate-50 rounded-[2rem] overflow-hidden transition-all hover:bg-white hover:shadow-lg">
                                <div className="absolute left-0 top-0 bottom-0 w-2 bg-blue-500 transform -translate-x-1 group-hover:translate-x-0 transition-all" />
                                <div className="flex justify-between items-center">
                                    <span className="font-black text-slate-700 tracking-tight">{name}</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-2xl font-black text-blue-600">{count}</span>
                                        <span className="text-[10px] font-black text-slate-400 uppercase">Chamados</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Efficiency Indicators */}
                <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                        { label: 'Tempo Médio', value: '14min', icon: Clock, color: 'text-blue-500', bg: 'bg-blue-50' },
                        { label: 'Resolução', value: `${resolutionRate}%`, icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50' },
                        { label: 'Satisfação', value: averageRating, icon: Star, color: 'text-amber-500', bg: 'bg-amber-50' }
                    ].map((item, i) => (
                        <div key={i} className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-slate-200/50 border border-slate-50 flex flex-col items-center text-center">
                            <div className={`w-16 h-16 rounded-2xl ${item.bg} flex items-center justify-center ${item.color} mb-4 shadow-inner`}>
                                <item.icon size={32} />
                            </div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{item.label}</p>
                            <p className="text-3xl font-black text-slate-800">{item.value}</p>
                        </div>
                    ))}
                </div>

                {/* Weekly Trend Card */}
                <div className="bg-white rounded-[3rem] p-10 shadow-xl shadow-slate-200/50 border border-slate-50">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-black text-slate-800 flex items-center gap-3">
                            {weeklyChange >= 0 ? (
                                <TrendingUp className="text-rose-500" />
                            ) : (
                                <TrendingDown className="text-emerald-500" />
                            )}
                            Tendência Semanal
                        </h3>
                    </div>
                    <div className="text-center">
                        <p className="text-5xl font-black text-slate-800 mb-2">{thisWeekTickets}</p>
                        <p className="text-sm font-bold text-slate-500 mb-4">chamados esta semana</p>
                        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl ${weeklyChange > 0 ? 'bg-rose-50 text-rose-600' : weeklyChange < 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-600'
                            }`}>
                            {weeklyChange > 0 ? <TrendingUp size={18} /> : weeklyChange < 0 ? <TrendingDown size={18} /> : <Activity size={18} />}
                            <span className="font-black">
                                {weeklyChange > 0 ? '+' : ''}{weeklyChange}% vs semana anterior
                            </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-3">Semana passada: {lastWeekTickets} chamados</p>
                    </div>
                </div>

                {/* Critical Sectors Card */}
                <div className="lg:col-span-2 bg-gradient-to-br from-rose-50 to-orange-50 rounded-[3rem] p-10 shadow-xl shadow-rose-200/30 border border-rose-100">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-lg font-black text-slate-800 flex items-center gap-3">
                            <AlertTriangle className="text-rose-500" />
                            Setores Críticos
                        </h3>
                        <span className="bg-rose-100 text-rose-600 px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-widest">
                            Atenção Necessária
                        </span>
                    </div>
                    {criticalSectors.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {criticalSectors.map(([name, count], idx) => (
                                <div key={idx} className="bg-white/80 backdrop-blur-sm rounded-[2rem] p-6 border border-rose-100 shadow-lg">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${idx === 0 ? 'bg-rose-500 text-white' : idx === 1 ? 'bg-orange-500 text-white' : 'bg-amber-500 text-white'
                                            }`}>
                                            <span className="font-black">{idx + 1}</span>
                                        </div>
                                        <span className="font-black text-slate-700">{name}</span>
                                    </div>
                                    <p className="text-3xl font-black text-slate-800">{count}</p>
                                    <p className="text-xs font-bold text-slate-400 uppercase">chamados críticos</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-slate-400">
                            <CheckCircle2 size={48} className="mx-auto mb-4 text-emerald-400" />
                            <p className="font-bold">Nenhum setor crítico no momento!</p>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

export default Dashboard;
