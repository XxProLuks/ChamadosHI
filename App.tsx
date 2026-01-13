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
import notifyByEmail from './lib/emailService';
import { useTickets } from './hooks/useTickets';
import { useGlobalAlerts } from './hooks/useGlobalAlerts';
import { useNotifications } from './hooks/useNotifications';

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

  // Custom Hooks
  const {
    tickets,
    loading: ticketsLoading,
    hasMore,
    fetchNextPage,
    updateTicketStatus,
    deleteTicket,
    pinTicket
  } = useTickets(session?.user.id, profile?.role);

  const {
    notifications,
    markAllAsRead
  } = useNotifications(session?.user.id);

  const {
    activeAlerts,
    visibleAlerts,
    previousAlertIds,
    setPreviousAlertIds
  } = useGlobalAlerts(session?.user.id);

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

  const fetchSectors = async () => {
    const { data } = await supabase.from('sectors').select('*').order('name');
    if (data) setSectors(data);
  };

  useEffect(() => {
    if (session) {
      fetchSectors();
    }
  }, [session]);

  // Desktop notifications for new CRITICAL alerts
  useEffect(() => {
    if (!session) return;

    const currentIds = activeAlerts.map(a => a.id);
    const newAlerts = activeAlerts.filter(alert =>
      !previousAlertIds.includes(alert.id) && alert.type === 'CRITICAL'
    );

    newAlerts.forEach(sendDesktopNotification);
    setPreviousAlertIds(currentIds);
  }, [activeAlerts, session, previousAlertIds, setPreviousAlertIds]);

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

      // Notificar técnicos do setor por email
      const { data: techs } = await supabase
        .from('profiles')
        .select('email')
        .eq('role', 'TECNICO');

      if (techs && techs.length > 0) {
        const techEmails = techs.map(t => t.email).filter(Boolean) as string[];
        const sectorName = sectors.find(s => s.id === (selectedSector?.id || newTicket.sector_id))?.name || 'Geral';

        notifyByEmail.ticketCreated(
          techEmails,
          newTicket.title || 'Sem título',
          'NOVO', // ID será gerado, mas notificamos o evento
          profile?.full_name || 'Solicitante',
          newTicket.location || 'Não informado'
        );
      }
    }
  }, [session, selectedSector?.id, profile?.full_name, sectors]);

  const handleUpdateStatus = useCallback(async (id: string, status: TicketStatus) => {
    if (!session) return;

    const { success } = await updateTicketStatus(id, status, session.user.id);

    if (success) {
      if (selectedTicket?.id === id) {
        setSelectedTicket(prev => prev ? { ...prev, status, updated_at: new Date().toISOString() } as Ticket : null);
      }

      // Notificar solicitante sobre a mudança de status
      const ticket = tickets.find(t => t.id === id);
      if (ticket) {
        const { data: requesterProfile } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', ticket.requester_id)
          .single();

        if (requesterProfile?.email) {
          if (status === 'DONE') {
            notifyByEmail.ticketCompleted(
              requesterProfile.email,
              ticket.title,
              profile?.full_name || 'Técnico'
            );
          } else {
            notifyByEmail.statusChanged(
              requesterProfile.email,
              ticket.title,
              ticket.status,
              status,
              profile?.full_name || 'Técnico'
            );
          }
        }
      }
    }
  }, [session, profile?.full_name, selectedTicket?.id, updateTicketStatus, tickets]);

  const handleDeleteTicket = useCallback(async (id: string) => {
    const { success } = await deleteTicket(id);
    if (success && selectedTicket?.id === id) {
      setSelectedTicket(null);
    }
  }, [deleteTicket, selectedTicket?.id]);

  const handlePinTicket = useCallback(async (id: string, isPinned: boolean) => {
    if (!session) return;
    await pinTicket(id, isPinned, session.user.id);
  }, [session, pinTicket]);

  const handleSelectSector = (sector: Sector) => {
    setSelectedSector(sector);
    setPrefillData({});
    setIsModalOpen(true);
  };

  const handleViewTicketDetails = (ticket: Ticket) => {
    setSelectedTicket(ticket);
  };

  const handleNotificationClick = async () => {
    markAllAsRead();
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
              hasMore={hasMore}
              onLoadMore={fetchNextPage}
            />
          ) : (
            <TecnicoView
              tickets={tickets}
              onUpdateStatus={handleUpdateStatus}
              onViewDetails={handleViewTicketDetails}
              onPinTicket={handlePinTicket}
              searchQuery={debouncedSearchQuery}
              onSearchChange={setSearchQuery}
              hasMore={hasMore}
              onLoadMore={fetchNextPage}
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
