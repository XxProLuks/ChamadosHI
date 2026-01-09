import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Session } from '@supabase/supabase-js';
import toast from 'react-hot-toast';
import { supabase } from './lib/supabase';
import { requestNotificationPermission, sendDesktopNotification } from './lib/notifications';
import { isAlertDismissed } from './lib/localStorage';
import { Ticket, ViewType, Sector, TicketStatus, TicketCategory, Notification, Profile, GlobalAlert } from './types';
import Header from './components/Header';
import SolicitanteView from './components/SolicitanteView';
import TecnicoView from './components/TecnicoView';
import Dashboard from './components/Dashboard';
import TicketModal from './components/TicketModal';
import TicketDetailModal from './components/TicketDetailModal';
import Auth from './components/Auth';
import UserManager from './components/UserManager';
import SectorManager from './components/SectorManager';
import GlobalAlertManager from './components/GlobalAlertManager';
import { Loader2 } from 'lucide-react';

// Debounce utility for search
const useDebounce = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
};

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [view, setView] = useState<ViewType>('SOLICITANTE');
  const [showDashboard, setShowDashboard] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [selectedSector, setSelectedSector] = useState<Sector | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [prefillData, setPrefillData] = useState<{ title?: string; category?: TicketCategory }>({});
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showUserManager, setShowUserManager] = useState(false);
  const [showSectorManager, setShowSectorManager] = useState(false);
  const [showGlobalAlertManager, setShowGlobalAlertManager] = useState(false);
  const [activeAlerts, setActiveAlerts] = useState<GlobalAlert[]>([]);
  const [previousAlertIds, setPreviousAlertIds] = useState<string[]>([]);

  // Debounced search query (300ms delay)
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Theme Management
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Auth & Profile Management
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchProfile(session.user.id);
        // Request notification permission
        requestNotificationPermission();
      }
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (data) {
      setProfile(data);
      // Auto-set view based on role
      setView(data.role === 'TECNICO' || data.role === 'ADMIN' ? 'TECNICO' : 'SOLICITANTE');
    }
    setLoading(false);
  };

  // Data Fetching
  useEffect((): (() => void) | void => {
    if (session) {
      fetchSectors();
      fetchTickets();
      fetchNotifications();

      // Real-time Subscriptions
      const ticketSubscription = supabase
        .channel('tickets-channel')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, () => {
          fetchTickets();
        })
        .subscribe();

      const notificationSubscription = supabase
        .channel('notifications-channel')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${session.user.id}` }, () => {
          fetchNotifications();
        })
        .subscribe();

      return () => {
        ticketSubscription.unsubscribe();
        notificationSubscription.unsubscribe();
      };
    }
  }, [session]);

  const fetchSectors = async () => {
    const { data } = await supabase.from('sectors').select('*').order('name');
    if (data) setSectors(data);
  };

  const fetchTickets = async () => {
    const { data } = await supabase
      .from('tickets')
      .select(`
        *,
        requester:profiles!requester_id(full_name),
        technician:profiles!technician_id(full_name, avatar_url),
        sector:sectors(name)
      `)
      .order('created_at', { ascending: false });

    if (data) {
      const formattedTickets = data.map((t: any) => ({
        ...t,
        requester_name: t.requester?.full_name,
        technician_name: t.technician?.full_name,
        technician_avatar: t.technician?.avatar_url,
        sector_name: t.sector?.name
      }));
      setTickets(formattedTickets);
    }
  };

  const fetchNotifications = async () => {
    if (!session) return;
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });
    if (data) {
      const formatted = data.map(n => ({ ...n, read: n.is_read }));
      setNotifications(formatted);
    }
  };

  const fetchActiveAlerts = useCallback(async () => {
    const { data, error } = await supabase
      .from('global_alerts')
      .select('*')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (!error && data) {
      setActiveAlerts(data);
    }
  }, []);

  // Global Alerts Monitoring (Realtime + Backup Polling)
  useEffect(() => {
    if (!session) return;

    fetchActiveAlerts();

    // Realtime Subscription
    const alertsChannel = supabase
      .channel('global_alerts_sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'global_alerts' },
        () => {
          fetchActiveAlerts();
        }
      )
      .subscribe();

    // Backup polling (60 seconds) - Realtime should handle most updates
    const interval = setInterval(() => {
      fetchActiveAlerts();
    }, 60000);

    return () => {
      supabase.removeChannel(alertsChannel);
      clearInterval(interval);
    };
  }, [session, fetchActiveAlerts]);

  // Desktop notifications for new CRITICAL alerts
  useEffect(() => {
    if (!session) return;

    const currentIds = activeAlerts.map(a => a.id);
    const newAlerts = activeAlerts.filter(alert =>
      !previousAlertIds.includes(alert.id) && alert.type === 'CRITICAL'
    );

    newAlerts.forEach(sendDesktopNotification);
    setPreviousAlertIds(currentIds);
  }, [activeAlerts, session]);

  // Memoized visible alerts (filtered by dismissed state)
  const visibleAlerts = useMemo(
    () => activeAlerts.filter(alert => !isAlertDismissed(alert.id, session?.user?.id || '')),
    [activeAlerts, session?.user?.id]
  );

  const handleCreateTicket = useCallback(async (newTicket: Partial<Ticket>) => {
    if (!session) return;

    const finalPriority = newTicket.priority || 'MEDIUM';

    const { error } = await supabase
      .from('tickets')
      .insert([{
        ...newTicket,
        sector_id: selectedSector?.id || newTicket.sector_id,
        priority: finalPriority,
        is_critical: newTicket.is_critical || finalPriority === 'CRITICAL',
        requester_id: session.user.id,
        image_urls: newTicket.image_urls
      }]);

    if (error) {
      toast.error('Erro ao criar chamado: ' + error.message);
    } else {
      toast.success('Chamado criado com sucesso!');
      setIsModalOpen(false);
      setSelectedSector(null);
      setPrefillData({});
    }
  }, [session, selectedSector?.id]);

  const handleUpdateStatus = useCallback(async (id: string, status: TicketStatus) => {
    if (!session) return;

    const updates: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
    if (status === 'IN_PROGRESS' && profile?.role !== 'SOLICITANTE') {
      updates.technician_id = session.user.id;
    }

    const { error } = await supabase
      .from('tickets')
      .update(updates)
      .eq('id', id);

    if (error) {
      toast.error('Erro ao atualizar status: ' + error.message);
    } else {
      if (selectedTicket?.id === id) {
        setSelectedTicket(prev => prev ? { ...prev, ...updates } as Ticket : null);
      }
      toast.success('Status atualizado!');
    }
  }, [session, profile?.role, selectedTicket?.id]);

  const handleDeleteTicket = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('tickets')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Erro ao excluir chamado: ' + error.message);
    } else {
      setTickets(prev => prev.filter(t => t.id !== id));
      setSelectedTicket(null);
      toast.success('Chamado excluído!');
    }
  }, []);

  const handlePinTicket = useCallback(async (id: string, isPinned: boolean) => {
    if (!session) return;

    try {
      const updates = {
        is_pinned: isPinned,
        pinned_at: isPinned ? new Date().toISOString() : undefined,
        pinned_by: isPinned ? session.user.id : undefined
      };

      const { error } = await supabase
        .from('tickets')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      setTickets(prev => prev.map(t =>
        t.id === id ? { ...t, ...updates } : t
      ));

      toast.success(isPinned ? 'Ticket fixado!' : 'Ticket desafixado!');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error('Erro ao fixar ticket: ' + msg);
    }
  }, [session]);

  const handleSelectSector = (sector: Sector) => {
    setSelectedSector(sector);
    setPrefillData({});
    setIsModalOpen(true);
  };

  const handleViewTicketDetails = (ticket: Ticket) => {
    setSelectedTicket(ticket);
  };

  const handleNotificationClick = async () => {
    if (!session) return;
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', session.user.id);
    fetchNotifications();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 text-blue-600">
        <Loader2 className="animate-spin" size={48} aria-label="Carregando..." />
      </div>
    );
  }

  if (!session) {
    return <Auth onSuccess={() => { }} />;
  }

  return (
    <div className={`min-h-screen transition-colors duration-500 ${darkMode ? 'dark bg-slate-950' : 'bg-slate-50'}`}>
      <Header
        view={view}
        setView={setView}
        notifications={notifications}
        onNotificationClick={handleNotificationClick}
        userName={profile?.full_name}
        userRole={profile?.role}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
        showDashboard={showDashboard}
        setShowDashboard={setShowDashboard}
        onToggleDashboard={() => setShowDashboard(!showDashboard)}
        onOpenUserManager={profile?.role === 'ADMIN' ? () => setShowUserManager(true) : undefined}
        onOpenSectorManager={profile?.role === 'ADMIN' ? () => setShowSectorManager(true) : undefined}
        onOpenAlertManager={profile?.role === 'ADMIN' || profile?.role === 'TECNICO' ? () => setShowGlobalAlertManager(true) : undefined}
        activeAlerts={visibleAlerts}
      />

      <main className="flex-grow" role="main">
        {showDashboard && (profile?.role === 'TECNICO' || profile?.role === 'ADMIN') ? (
          <Dashboard tickets={tickets} />
        ) : (
          view === 'SOLICITANTE' ? (
            <SolicitanteView
              sectors={sectors}
              onSelectSector={handleSelectSector}
              searchQuery={debouncedSearchQuery}
              onSearchChange={setSearchQuery}
              tickets={tickets}
              onViewTicketDetails={handleViewTicketDetails}
              requesterName={profile?.full_name || ''}
            />
          ) : (
            <TecnicoView
              tickets={tickets}
              onUpdateStatus={handleUpdateStatus}
              onViewDetails={handleViewTicketDetails}
              onPinTicket={handlePinTicket}
              searchQuery={debouncedSearchQuery}
              onSearchChange={setSearchQuery}
            />
          )
        )}
      </main>

      {isModalOpen && (
        <TicketModal
          sector={selectedSector}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedSector(null);
            setPrefillData({});
          }}
          onSubmit={handleCreateTicket}
          prefillTitle={prefillData.title}
          prefillCategory={prefillData.category}
        />
      )}

      {selectedTicket && (
        <TicketDetailModal
          ticket={selectedTicket}
          onClose={() => setSelectedTicket(null)}
          onUpdateStatus={(profile?.role === 'TECNICO' || profile?.role === 'ADMIN') ? handleUpdateStatus : undefined}
          onDelete={handleDeleteTicket}
          isRequester={view === 'SOLICITANTE'}
          currentUserId={session?.user?.id}
          currentUserName={profile?.full_name || session?.user?.email?.split('@')[0] || 'Usuário'}
          currentUserRole={profile?.role || 'SOLICITANTE'}
        />
      )}

      {showUserManager && (
        <UserManager
          onClose={() => setShowUserManager(false)}
          currentUserRole={profile?.role || 'SOLICITANTE'}
        />
      )}

      {showSectorManager && (
        <SectorManager
          onClose={() => setShowSectorManager(false)}
        />
      )}

      {showGlobalAlertManager && (
        <GlobalAlertManager
          onClose={() => setShowGlobalAlertManager(false)}
          currentUserId={session.user.id}
        />
      )}
    </div>
  );
};

export default App;
