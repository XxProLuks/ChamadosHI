import React, { useState } from 'react';
import { ViewType, Notification, GlobalAlert } from '../types';
import { supabase } from '../lib/supabase';
import { markAlertAsDismissed, isAlertDismissed } from '../lib/localStorage';
import {
  LogOut,
  Bell,
  Hospital,
  Menu,
  X,
  Sun,
  Moon,
  LayoutDashboard,
  Inbox,
  ArrowLeftRight,
  Users,
  Building,
  Megaphone,
  AlertCircle,
  AlertTriangle,
  Info
} from 'lucide-react';

interface HeaderProps {
  view: ViewType;
  setView: (view: ViewType) => void;
  notifications: Notification[];
  onNotificationClick: () => void;
  userName?: string;
  userRole?: string;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  showDashboard: boolean;
  setShowDashboard: (show: boolean) => void;
  onToggleDashboard: () => void;
  onOpenUserManager?: () => void;
  onOpenSectorManager?: () => void;
  onOpenAlertManager?: () => void;
  activeAlerts: GlobalAlert[];
}

const Header: React.FC<HeaderProps> = ({
  view,
  setView,
  notifications = [],
  onNotificationClick,
  userName,
  userRole,
  darkMode,
  onToggleDarkMode,
  showDashboard,
  setShowDashboard,
  onToggleDashboard,
  onOpenUserManager,
  onOpenSectorManager,
  onOpenAlertManager,
  activeAlerts = []
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const unreadCount = notifications.filter(n => !n.is_read).length;
  const isSolicitante = view === 'SOLICITANTE';
  const isAdminOrTech = userRole === 'TECNICO' || userRole === 'ADMIN';

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const handleDismissAlert = async (alertId: string, alertType: string) => {
    if (!supabase.auth.getUser()) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Mark as dismissed in localStorage
    markAlertAsDismissed(alertId, user.id);

    // Update dismiss count in database only if not CRITICAL (CRITICAL can't be dismissed)
    if (alertType !== 'CRITICAL') {
      const { data: currentAlert } = await supabase
        .from('global_alerts')
        .select('dismiss_count, dismissed_by')
        .eq('id', alertId)
        .single();

      if (currentAlert) {
        const dismissedBy = currentAlert.dismissed_by || [];
        if (!dismissedBy.includes(user.id)) {
          await supabase
            .from('global_alerts')
            .update({
              dismiss_count: (currentAlert.dismiss_count || 0) + 1,
              dismissed_by: [...dismissedBy, user.id]
            })
            .eq('id', alertId);
        }
      }
    }
  };

  return (
    <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50 transition-colors duration-500">
      <div className="max-w-[1800px] mx-auto px-6 lg:px-10">
        <div className="flex justify-between items-center h-20 md:h-24">

          {/* Left: Logo & Context */}
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-xl shadow-blue-200 dark:shadow-blue-900/20 cursor-pointer">
              <Hospital size={32} />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-black text-slate-800 dark:text-white leading-tight tracking-tight">Hospital de Ilhéus</h1>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">
                  {showDashboard ? 'Analytics Center' : isSolicitante ? 'Service Portal' : 'Ops Dashboard'}
                </p>
              </div>
            </div>
          </div>

          {/* Center: Main Navigation (Desktop) */}
          <div className="hidden md:flex items-center bg-slate-100/80 dark:bg-slate-800/80 p-1.5 rounded-3xl border border-white dark:border-slate-700/50 shadow-inner">
            <button
              onClick={() => { setView('SOLICITANTE'); setShowDashboard(false); }}
              className={`flex items-center gap-2.5 px-8 py-3.5 rounded-[1.25rem] text-sm font-black transition-all duration-300 ${isSolicitante && !showDashboard
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xl shadow-slate-200/50 dark:shadow-black/20 scale-105'
                : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
                }`}
            >
              <Inbox size={18} />
              Solicitante
            </button>
            {isAdminOrTech && (
              <button
                onClick={() => { setView('TECNICO'); setShowDashboard(false); }}
                className={`flex items-center gap-2.5 px-8 py-3.5 rounded-[1.25rem] text-sm font-black transition-all duration-300 ${!isSolicitante && !showDashboard
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xl shadow-slate-200/50 dark:shadow-black/20 scale-105'
                  : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
                  }`}
              >
                <ArrowLeftRight size={18} />
                Painel Técnico
              </button>
            )}
            {isAdminOrTech && (
              <button
                onClick={onToggleDashboard}
                className={`flex items-center gap-2.5 px-8 py-3.5 rounded-[1.25rem] text-sm font-black transition-all duration-300 ${showDashboard
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xl shadow-slate-200/50 dark:shadow-black/20 scale-105'
                  : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
                  }`}
              >
                <LayoutDashboard size={18} />
                Dashboard
              </button>
            )}
            {onOpenUserManager && (
              <button
                onClick={onOpenUserManager}
                className="flex items-center gap-2.5 px-8 py-3.5 rounded-[1.25rem] text-sm font-black transition-all duration-300 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <Users size={18} />
                Usuários
              </button>
            )}
            {onOpenSectorManager && (
              <button
                onClick={onOpenSectorManager}
                className="flex items-center gap-2.5 px-8 py-3.5 rounded-[1.25rem] text-sm font-black transition-all duration-300 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <Building size={18} />
                Setores
              </button>
            )}
            {onOpenAlertManager && (
              <button
                onClick={onOpenAlertManager}
                className="flex items-center gap-2.5 px-8 py-3.5 rounded-[1.25rem] text-sm font-black transition-all duration-300 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <Megaphone size={18} />
                Alertas
              </button>
            )}
          </div>

          {/* Right: Actions & User */}
          <div className="flex items-center gap-3">

            {/* Theme Toggle */}
            <button
              onClick={onToggleDarkMode}
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-90"
              aria-label={darkMode ? "Ativar modo claro" : "Ativar modo escuro"}
            >
              {darkMode ? <Sun size={24} /> : <Moon size={24} />}
            </button>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  if (!showNotifications) onNotificationClick();
                }}
                className={`w-12 h-12 rounded-2xl transition-all flex items-center justify-center relative ${showNotifications ? 'bg-blue -600 text-white shadow-xl shadow-blue-200 dark:shadow-blue-900/40' : 'text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                aria-label={`Notificações${unreadCount > 0 ? ` (${unreadCount} não lidas)` : ''}`}
              >
                <Bell size={24} />
                {unreadCount > 0 && (
                  <span className="absolute top-2 right-2 w-5 h-5 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-4 border-white dark:border-slate-900 animate-bounce">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Advanced Notifications Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-5 w-96 bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-700 p-2 overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-[100]">
                  <div className="px-6 py-5 border-b border-slate-50 dark:border-slate-700/50 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50 rounded-t-[2.25rem]">
                    <span className="font-black text-slate-800 dark:text-white uppercase tracking-widest text-xs">Notificações</span>
                    <button onClick={() => setShowNotifications(false)} className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-white dark:hover:bg-slate-700 hover:text-slate-600 transition-all">
                      <X size={16} />
                    </button>
                  </div>
                  <div className="max-h-[400px] overflow-y-auto no-scrollbar space-y-2 p-2">
                    {notifications.length === 0 ? (
                      <div className="py-20 text-center text-slate-300 dark:text-slate-600">
                        <Bell size={48} className="mx-auto mb-4 opacity-20" />
                        <p className="font-bold text-sm">Sem novidades por aqui</p>
                      </div>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} className={`p-5 rounded-[1.5rem] transition-all border-2 ${n.is_read ? 'bg-white dark:bg-slate-800 border-transparent text-slate-400' : 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-900/30'}`}>
                          <p className={`text-sm leading-snug font-bold ${n.is_read ? 'text-slate-500' : 'text-slate-800 dark:text-blue-100'}`}>{n.message}</p>
                          <div className="flex items-center gap-2 mt-3">
                            <div className={`w-1.5 h-1.5 rounded-full ${n.is_read ? 'bg-slate-200' : 'bg-blue-500'}`} />
                            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">há 5 minutos</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Section */}
            <div className="flex items-center gap-4 pl-4 border-l border-slate-100 dark:border-slate-800">
              <div className="hidden lg:block text-right">
                <p className="text-sm font-black text-slate-800 dark:text-white leading-none tracking-tight">{userName || 'Usuário'}</p>
                <div className="flex items-center gap-2 justify-end mt-1">
                  <div className={`w-2 h-2 rounded-full ${userRole === 'ADMIN' ? 'bg-rose-500' : userRole === 'TECNICO' ? 'bg-blue-500' : 'bg-emerald-500'}`} />
                  <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">{userRole || 'Colaborador'}</p>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-600 transition-all border border-slate-50 dark:border-slate-700 active:scale-95 group shadow-sm"
                aria-label="Sair do sistema"
              >
                <LogOut size={22} className="mx-auto group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Global Alert Banner */}
      {activeAlerts.length > 0 && (
        <div className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
          <div className="max-w-[1800px] mx-auto overflow-hidden">
            <div className="flex flex-col">
              {activeAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`flex items-center gap-4 px-6 py-3.5 relative animate-in slide-in-from-top-5 duration-500 ${alert.type === 'CRITICAL'
                      ? 'bg-rose-600 text-white animate-[shake_0.5s_ease-in-out_infinite,pulse_2s_ease-in-out_infinite]'
                      : alert.type === 'WARNING'
                        ? 'bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-100 animate-[pulse_3s_ease-in-out_infinite]'
                        : 'bg-blue-600 text-white'
                    }`}
                  style={{
                    animationDelay: `${activeAlerts.indexOf(alert) * 100}ms`
                  }}
                >
                  <div className="flex-shrink-0 animate-bounce">
                    {alert.type === 'CRITICAL' ? <AlertCircle size={22} /> :
                      alert.type === 'WARNING' ? <AlertTriangle size={22} /> :
                        <Megaphone size={22} />}
                  </div>
                  <p className="text-sm font-black flex-1 uppercase tracking-wider">
                    {alert.message}
                  </p>
                  <div className="hidden sm:flex items-center gap-4">
                    <div className="text-[10px] font-black opacity-70 uppercase tracking-widest">
                      {alert.type === 'CRITICAL' ? '🚨 ALERTA CRÍTICO' :
                        alert.type === 'WARNING' ? '⚠️ ATENÇÃO' : 'ℹ️ INFORMAÇÃO'}
                    </div>
                    {alert.type !== 'CRITICAL' && (
                      <button
                        onClick={() => handleDismissAlert(alert.id, alert.type)}
                        className="w-8 h-8 rounded-full hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center transition-all active:scale-90 group"
                        aria-label="Dispensar alerta"
                        title="Dispensar este alerta"
                      >
                        <X size={18} className="group-hover:rotate-90 transition-transform duration-200" />
                      </button>
                    )}
                  </div>
                  {/* Mobile dismiss button */}
                  {alert.type !== 'CRITICAL' && (
                    <button
                      onClick={() => handleDismissAlert(alert.id, alert.type)}
                      className="sm:hidden w-8 h-8 rounded-full hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center transition-all"
                      aria-label="Dispensar"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
