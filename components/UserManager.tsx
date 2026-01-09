import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Profile, UserRole } from '../types';
import {
    Users, Search, X, Edit2, Trash2, Shield, UserCircle, Wrench,
    ChevronDown, Check, AlertTriangle, Loader2, UserPlus, Mail
} from 'lucide-react';

interface UserManagerProps {
    onClose: () => void;
    currentUserRole: UserRole;
}

const roleConfig: Record<UserRole, { label: string; color: string; icon: any }> = {
    SOLICITANTE: { label: 'Solicitante', color: 'bg-emerald-100 text-emerald-700', icon: UserCircle },
    TECNICO: { label: 'Técnico', color: 'bg-blue-100 text-blue-700', icon: Wrench },
    ADMIN: { label: 'Administrador', color: 'bg-rose-100 text-rose-700', icon: Shield }
};

const UserManager: React.FC<UserManagerProps> = ({ onClose, currentUserRole }) => {
    const [users, setUsers] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [editingUser, setEditingUser] = useState<Profile | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('full_name');

        if (data) {
            setUsers(data);
        }
        if (error) {
            setError('Erro ao carregar usuários');
        }
        setLoading(false);
    };

    const handleUpdateRole = async (userId: string, newRole: UserRole) => {
        setSaving(true);
        const { error } = await supabase
            .from('profiles')
            .update({ role: newRole, updated_at: new Date().toISOString() })
            .eq('id', userId);

        if (!error) {
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
            setEditingUser(null);
        } else {
            setError('Erro ao atualizar função');
        }
        setSaving(false);
    };

    const handleDeleteUser = async (userId: string) => {
        setSaving(true);
        // Note: This deletes the profile, the auth user would need to be deleted from Supabase Auth separately
        const { error } = await supabase
            .from('profiles')
            .delete()
            .eq('id', userId);

        if (!error) {
            setUsers(prev => prev.filter(u => u.id !== userId));
            setDeleteConfirm(null);
        } else {
            setError('Erro ao excluir usuário');
        }
        setSaving(false);
    };

    const filteredUsers = users.filter(user =>
        user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.role.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (currentUserRole !== 'ADMIN') {
        return (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
                <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-10 max-w-md text-center">
                    <Shield size={64} className="mx-auto text-rose-500 mb-6" />
                    <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-4">Acesso Negado</h2>
                    <p className="text-slate-500 dark:text-slate-400 mb-6">Apenas administradores podem gerenciar usuários.</p>
                    <button
                        onClick={onClose}
                        className="px-8 py-4 bg-slate-100 dark:bg-slate-700 rounded-2xl font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
                    >
                        Voltar
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[200] p-4 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">

                {/* Header */}
                <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-br from-blue-50 to-slate-50 dark:from-slate-800 dark:to-slate-900">
                    <div className="flex items-center gap-5">
                        <div className="w-16 h-16 rounded-3xl bg-blue-600 flex items-center justify-center text-white shadow-xl shadow-blue-200 dark:shadow-blue-900/30">
                            <Users size={32} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Gerenciar Usuários</h2>
                            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mt-1">{users.length} usuários cadastrados</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm border border-slate-100 dark:border-slate-700"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Search */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-800">
                    <div className="relative">
                        <Search size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar por nome ou função..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-14 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white placeholder-slate-400 focus:border-blue-400 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all font-medium"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                <X size={20} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mx-6 mt-4 p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-2xl flex items-center gap-3 text-rose-700 dark:text-rose-400">
                        <AlertTriangle size={20} />
                        <span className="font-medium">{error}</span>
                        <button onClick={() => setError(null)} className="ml-auto"><X size={18} /></button>
                    </div>
                )}

                {/* Users List */}
                <div className="flex-1 overflow-y-auto p-6 space-y-3">
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 size={48} className="animate-spin text-blue-500" />
                        </div>
                    ) : filteredUsers.length === 0 ? (
                        <div className="text-center py-20">
                            <Users size={64} className="mx-auto text-slate-200 dark:text-slate-700 mb-4" />
                            <p className="text-slate-400 font-bold">Nenhum usuário encontrado</p>
                        </div>
                    ) : (
                        filteredUsers.map((user) => {
                            const roleInfo = roleConfig[user.role];
                            const RoleIcon = roleInfo.icon;
                            const isEditing = editingUser?.id === user.id;
                            const isDeleting = deleteConfirm === user.id;

                            return (
                                <div
                                    key={user.id}
                                    className={`p-5 rounded-[2rem] border-2 transition-all ${isEditing || isDeleting
                                            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                                            : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:border-blue-100 dark:hover:border-blue-800'
                                        }`}
                                >
                                    <div className="flex items-center gap-4">
                                        {/* Avatar */}
                                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-100 to-slate-100 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center text-blue-600 dark:text-blue-400 font-black text-lg overflow-hidden">
                                            {user.avatar_url ? (
                                                <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                user.full_name.charAt(0).toUpperCase()
                                            )}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-black text-slate-800 dark:text-white text-lg truncate">{user.full_name}</h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider ${roleInfo.color}`}>
                                                    <RoleIcon size={12} />
                                                    {roleInfo.label}
                                                </span>
                                                {user.sector && (
                                                    <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">• {user.sector}</span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        {isDeleting ? (
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-bold text-rose-600 dark:text-rose-400 mr-2">Confirmar exclusão?</span>
                                                <button
                                                    onClick={() => handleDeleteUser(user.id)}
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
                                        ) : isEditing ? (
                                            <div className="flex items-center gap-2">
                                                {(['SOLICITANTE', 'TECNICO', 'ADMIN'] as UserRole[]).map((role) => (
                                                    <button
                                                        key={role}
                                                        onClick={() => handleUpdateRole(user.id, role)}
                                                        disabled={saving}
                                                        className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${user.role === role
                                                                ? 'bg-blue-600 text-white shadow-xl'
                                                                : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                                                            }`}
                                                    >
                                                        {roleConfig[role].label}
                                                    </button>
                                                ))}
                                                <button
                                                    onClick={() => setEditingUser(null)}
                                                    className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-all"
                                                >
                                                    <X size={18} />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => setEditingUser(user)}
                                                    className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
                                                    title="Editar função"
                                                >
                                                    <Edit2 size={20} />
                                                </button>
                                                <button
                                                    onClick={() => setDeleteConfirm(user.id)}
                                                    className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all"
                                                    title="Excluir usuário"
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

                {/* Footer */}
                <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                    <p className="text-center text-xs text-slate-400 dark:text-slate-500 font-medium">
                        Apenas usuários com perfil de Administrador podem gerenciar permissões
                    </p>
                </div>
            </div>
        </div>
    );
};

export default UserManager;
