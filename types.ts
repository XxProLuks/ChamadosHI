export interface GlobalAlert {
  id: string;
  message: string;
  type: 'INFO' | 'WARNING' | 'CRITICAL';
  created_at: string;
  expires_at: string;
  created_by: string;
  dismissed_by?: string[];
  view_count?: number;
  dismiss_count?: number;
}

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type TicketStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';
export type TicketCategory = 'CHAMADO' | 'CRITICAL' | 'MAINTENANCE' | 'CLIMATIZACAO' | 'TI';
export type UserRole = 'SOLICITANTE' | 'TECNICO' | 'ADMIN';

export interface Sector {
  id: string;
  name: string;
  icon: string;
  colorClass: string;
}

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  avatar_url?: string;
  sector?: string;
}

export interface Ticket {
  id: string;
  title: string;
  description?: string;
  location: string;
  sector_id: string;
  category: TicketCategory;
  status: TicketStatus;
  priority: Priority;
  requester_id?: string;
  technician_id?: string;
  image_url?: string;
  image_urls?: string[];
  is_critical: boolean;
  is_pinned?: boolean;
  pinned_at?: string;
  pinned_by?: string;
  created_at: string;
  updated_at: string;

  // Virtual fields (joined from profiles/sectors)
  requester_name?: string;
  technician_name?: string;
  technician_avatar?: string;
  sector_name?: string;
  rating?: number;
  rating_comment?: string;
}

export interface Notification {
  id: string;
  user_id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  ticket_id?: string;
  is_read: boolean;
  created_at: string;
}

export type ViewType = 'SOLICITANTE' | 'TECNICO';
