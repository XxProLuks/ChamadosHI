import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Sector } from '../types';
import {
    Building, Search, X, Edit2, Trash2, Plus, Loader2, AlertTriangle,
    Palette, Save, Zap, Pill, FlaskConical, Heart, Cpu, Activity,
    Stethoscope, Syringe, Baby, Monitor, Bed, Phone, Users, Settings, Receipt, LucideIcon
} from 'lucide-react';

interface SectorManagerProps {
    onClose: () => void;
}

const availableIcons: { name: string; icon: LucideIcon }[] = [
    { name: 'Building', icon: Building },
    { name: 'Zap', icon: Zap },
    { name: 'Pill', icon: Pill },
    { name: 'FlaskConical', icon: FlaskConical },
    { name: 'Heart', icon: Heart },
    { name: 'Cpu', icon: Cpu },
    { name: 'Activity', icon: Activity },
    { name: 'Stethoscope', icon: Stethoscope },
    { name: 'Syringe', icon: Syringe },
    { name: 'Baby', icon: Baby },
    { name: 'Monitor', icon: Monitor },
    { name: 'Bed', icon: Bed },
    { name: 'Phone', icon: Phone },
    { name: 'Users', icon: Users },
    { name: 'Settings', icon: Settings },
    { name: 'Receipt', icon: Receipt }
];

const availableColors = [
    { name: 'Azul', class: 'bg-blue-100 text-blue-600' },
    { name: 'Verde', class: 'bg-emerald-100 text-emerald-600' },
    { name: 'Roxo', class: 'bg-purple-100 text-purple-600' },
    { name: 'Rosa', class: 'bg-pink-100 text-pink-600' },
    { name: 'Laranja', class: 'bg-orange-100 text-orange-600' },
    { name: 'Vermelho', class: 'bg-red-100 text-red-600' },
    { name: 'Amarelo', class: 'bg-amber-100 text-amber-600' },
    { name: 'Ciano', class: 'bg-cyan-100 text-cyan-600' },
    { name: 'Indigo', class: 'bg-indigo-100 text-indigo-600' },
    { name: 'Cinza', class: 'bg-slate-100 text-slate-600' }
];

const SectorManager: React.FC<SectorManagerProps> = ({ onClose }) => {
    const [sectors, setSectors] = useState<Sector[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [editingSector, setEditingSector] = useState<Sector | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);

    // Form state
    const [formName, setFormName] = useState('');
    const [formIcon, setFormIcon] = useState('Building');
    const [formColor, setFormColor] = useState('bg-blue-100 text-blue-600');

    useEffect(() => {
        fetchSectors();
    }, []);

    const fetchSectors = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('sectors')
            .select('*')
            .order('name');

        if (data) {
            setSectors(data);
        }
        if (error) {
            setError('Erro ao carregar setores');
        }
        setLoading(false);
    };

    const handleCreate = async () => {
        if (!formName.trim()) {
            setError('Nome do setor é obrigatório');
            return;
        }

        setSaving(true);
        const newId = formName.toUpperCase().replace(/\s+/g, '_').normalize('NFD').replace(/[\u0300-\u036f]/g, '');

        const { error } = await supabase
            .from('sectors')
            .insert([{
                id: newId,
                name: formName.trim(),
                icon: formIcon,
                color_class: formColor
            }]);

        if (!error) {
            await fetchSectors();
            setIsCreating(false);
            resetForm();
        } else {
            setError('Erro ao criar setor');
        }
        setSaving(false);
    };

    const handleUpdate = async () => {
        if (!editingSector || !formName.trim()) return;

        setSaving(true);
        const { error } = await supabase
            .from('sectors')
            .update({
                name: formName.trim(),
                icon: formIcon,
                color_class: formColor
            })
            .eq('id', editingSector.id);

        if (!error) {
            await fetchSectors();
            setEditingSector(null);
            resetForm();
        } else {
            setError('Erro ao atualizar setor');
        }
        setSaving(false);
    };

    const handleDelete = async (id: string) => {
        setSaving(true);
        const { error } = await supabase
            .from('sectors')
            .delete()
            .eq('id', id);

        if (!error) {
            setSectors(prev => prev.filter(s => s.id !== id));
            setDeleteConfirm(null);
        } else {
            setError('Erro ao excluir setor. Verifique se não há chamados vinculados.');
        }
        setSaving(false);
    };

    const startEdit = (sector: Sector) => {
        setEditingSector(sector);
        setFormName(sector.name);
        setFormIcon(sector.icon);
        setFormColor(sector.colorClass);
        setIsCreating(false);
    };

    const startCreate = () => {
        setIsCreating(true);
        setEditingSector(null);
        resetForm();
    };

    const resetForm = () => {
        setFormName('');
        setFormIcon('Building');
        setFormColor('bg-blue-100 text-blue-600');
    };

    const cancelEdit = () => {
        setEditingSector(null);
        setIsCreating(false);
        resetForm();
    };

    const filteredSectors = sectors.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getIconComponent = (iconName: string) => {
        const found = availableIcons.find(i => i.name === iconName);
        return found ? found.icon : Building;
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[200] p-4 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">

                {/* Header */}
                <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-br from-purple-50 to-slate-50 dark:from-slate-800 dark:to-slate-900">
                    <div className="flex items-center gap-5">
                        <div className="w-16 h-16 rounded-3xl bg-purple-600 flex items-center justify-center text-white shadow-xl shadow-purple-200 dark:shadow-purple-900/30">
                            <Building size={32} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Gerenciar Setores</h2>
                            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mt-1">{sectors.length} setores cadastrados</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm border border-slate-100 dark:border-slate-700"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Search + Create Button */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex gap-4">
                    <div className="relative flex-1">
                        <Search size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar setores..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-14 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white placeholder-slate-400 focus:border-purple-400 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all font-medium"
                        />
                    </div>
                    <button
                        onClick={startCreate}
                        className="flex items-center gap-2 px-6 py-4 bg-purple-600 text-white rounded-2xl font-bold hover:bg-purple-700 transition-all shadow-lg shadow-purple-200 dark:shadow-purple-900/30"
                    >
                        <Plus size={20} />
                        Novo Setor
                    </button>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mx-6 mt-4 p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-2xl flex items-center gap-3 text-rose-700 dark:text-rose-400">
                        <AlertTriangle size={20} />
                        <span className="font-medium">{error}</span>
                        <button onClick={() => setError(null)} className="ml-auto"><X size={18} /></button>
                    </div>
                )}

                {/* Create/Edit Form */}
                {(isCreating || editingSector) && (
                    <div className="mx-6 mt-4 p-6 bg-purple-50 dark:bg-purple-900/20 border-2 border-purple-200 dark:border-purple-800 rounded-3xl">
                        <h3 className="font-black text-slate-800 dark:text-white mb-4">
                            {isCreating ? 'Novo Setor' : `Editando: ${editingSector?.name}`}
                        </h3>

                        <div className="grid gap-4">
                            <input
                                type="text"
                                placeholder="Nome do setor"
                                value={formName}
                                onChange={(e) => setFormName(e.target.value)}
                                className="w-full px-5 py-4 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white placeholder-slate-400 focus:border-purple-400 outline-none transition-all font-medium"
                            />

                            {/* Icon Selection */}
                            <div>
                                <label className="text-xs font-black text-slate-500 uppercase tracking-wider mb-2 block">Ícone</label>
                                <div className="flex flex-wrap gap-2">
                                    {availableIcons.map(({ name, icon: Icon }) => (
                                        <button
                                            key={name}
                                            onClick={() => setFormIcon(name)}
                                            className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${formIcon === name
                                                    ? 'bg-purple-600 text-white shadow-lg'
                                                    : 'bg-white dark:bg-slate-800 text-slate-400 hover:text-purple-600 border border-slate-200 dark:border-slate-700'
                                                }`}
                                        >
                                            <Icon size={20} />
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Color Selection */}
                            <div>
                                <label className="text-xs font-black text-slate-500 uppercase tracking-wider mb-2 block">Cor</label>
                                <div className="flex flex-wrap gap-2">
                                    {availableColors.map(({ name, class: colorClass }) => (
                                        <button
                                            key={name}
                                            onClick={() => setFormColor(colorClass)}
                                            className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${colorClass} ${formColor === colorClass ? 'ring-4 ring-purple-400 ring-offset-2' : ''
                                                }`}
                                        >
                                            <Palette size={20} />
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Preview */}
                            <div className="flex items-center gap-4 p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                                <span className="text-xs font-black text-slate-400 uppercase">Preview:</span>
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${formColor}`}>
                                    {React.createElement(getIconComponent(formIcon), { size: 28 })}
                                </div>
                                <span className="font-bold text-slate-700 dark:text-slate-300">{formName || 'Nome do Setor'}</span>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 justify-end">
                                <button
                                    onClick={cancelEdit}
                                    className="px-6 py-3 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={isCreating ? handleCreate : handleUpdate}
                                    disabled={saving || !formName.trim()}
                                    className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-all disabled:opacity-50"
                                >
                                    {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                    {isCreating ? 'Criar' : 'Salvar'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Sectors List */}
                <div className="flex-1 overflow-y-auto p-6 space-y-3">
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 size={48} className="animate-spin text-purple-500" />
                        </div>
                    ) : filteredSectors.length === 0 ? (
                        <div className="text-center py-20">
                            <Building size={64} className="mx-auto text-slate-200 dark:text-slate-700 mb-4" />
                            <p className="text-slate-400 font-bold">Nenhum setor encontrado</p>
                        </div>
                    ) : (
                        filteredSectors.map((sector) => {
                            const IconComponent = getIconComponent(sector.icon);
                            const isDeleting = deleteConfirm === sector.id;

                            return (
                                <div
                                    key={sector.id}
                                    className={`p-5 rounded-[2rem] border-2 transition-all ${isDeleting
                                            ? 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800'
                                            : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:border-purple-100 dark:hover:border-purple-800'
                                        }`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${sector.colorClass}`}>
                                            <IconComponent size={28} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-black text-slate-800 dark:text-white text-lg">{sector.name}</h3>
                                            <p className="text-xs text-slate-400 font-medium">ID: {sector.id}</p>
                                        </div>

                                        {isDeleting ? (
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-bold text-rose-600 dark:text-rose-400 mr-2">Confirmar exclusão?</span>
                                                <button
                                                    onClick={() => handleDelete(sector.id)}
                                                    disabled={saving}
                                                    className="px-5 py-2.5 bg-rose-600 text-white rounded-xl font-bold text-sm hover:bg-rose-700 transition-all disabled:opacity-50"
                                                >
                                                    {saving ? <Loader2 size={16} className="animate-spin" /> : 'Excluir'}
                                                </button>
                                                <button
                                                    onClick={() => setDeleteConfirm(null)}
                                                    className="px-5 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
                                                >
                                                    Cancelar
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => startEdit(sector)}
                                                    className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all"
                                                >
                                                    <Edit2 size={20} />
                                                </button>
                                                <button
                                                    onClick={() => setDeleteConfirm(sector.id)}
                                                    className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all"
                                                >
                                                    <Trash2 size={20} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};

export default SectorManager;
