import { supabase } from './supabase';
import toast from 'react-hot-toast';

export type ERPType = 'TOTVS' | 'SAP' | 'OTHER';
export type SyncType = 'users' | 'departments' | 'tickets';
export type SyncStatus = 'pending' | 'running' | 'success' | 'error';

export interface ERPConfig {
    id: string;
    erp_type: ERPType;
    api_url: string;
    api_token?: string;
    company_code?: string;
    is_active: boolean;
    last_sync_at?: string;
    created_at: string;
    updated_at: string;
}

export interface SyncLog {
    id: string;
    sync_type: SyncType;
    direction: 'import' | 'export';
    status: SyncStatus;
    records_total: number;
    records_synced: number;
    records_failed: number;
    error_message?: string;
    started_at: string;
    completed_at?: string;
}

export interface ERPUser {
    erp_id: string;
    full_name: string;
    email: string;
    department?: string;
    role?: string;
}

export interface ERPDepartment {
    erp_id: string;
    name: string;
    code?: string;
}

/**
 * Class for managing ERP integration
 */
export class ERPConnector {
    private config: ERPConfig | null = null;

    /**
     * Initialize connector with ERP configuration
     */
    async init(): Promise<boolean> {
        try {
            const { data, error } = await supabase
                .from('erp_config')
                .select('*')
                .eq('is_active', true)
                .single();

            if (error) throw error;
            this.config = data;
            return true;
        } catch (error) {
            console.error('ERP config not found:', error);
            return false;
        }
    }

    /**
     * Test ERP connection
     */
    async testConnection(): Promise<{ success: boolean; message: string }> {
        if (!this.config) {
            return { success: false, message: 'Configuração ERP não encontrada' };
        }

        try {
            // Generic API health check
            const response = await fetch(`${this.config.api_url}/health`, {
                method: 'GET',
                headers: this.getHeaders()
            });

            if (response.ok) {
                return { success: true, message: 'Conexão estabelecida com sucesso!' };
            } else {
                return { success: false, message: `Erro HTTP: ${response.status}` };
            }
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : 'Erro de conexão';
            return { success: false, message: msg };
        }
    }

    /**
     * Get API headers for ERP requests
     */
    private getHeaders(): HeadersInit {
        const headers: HeadersInit = {
            'Content-Type': 'application/json'
        };

        if (this.config?.api_token) {
            headers['Authorization'] = `Bearer ${this.config.api_token}`;
        }

        if (this.config?.company_code) {
            headers['X-Company-Code'] = this.config.company_code;
        }

        return headers;
    }

    /**
     * Create sync log entry
     */
    private async createSyncLog(
        syncType: SyncType,
        direction: 'import' | 'export',
        userId: string
    ): Promise<string | null> {
        try {
            const { data, error } = await supabase
                .from('erp_sync_log')
                .insert([{
                    sync_type: syncType,
                    direction,
                    status: 'running',
                    created_by: userId
                }])
                .select('id')
                .single();

            if (error) throw error;
            return data.id;
        } catch (error) {
            console.error('Error creating sync log:', error);
            return null;
        }
    }

    /**
     * Update sync log entry
     */
    private async updateSyncLog(
        logId: string,
        updates: Partial<SyncLog>
    ): Promise<void> {
        try {
            await supabase
                .from('erp_sync_log')
                .update({
                    ...updates,
                    completed_at: updates.status !== 'running' ? new Date().toISOString() : undefined
                })
                .eq('id', logId);
        } catch (error) {
            console.error('Error updating sync log:', error);
        }
    }

    /**
     * Import users from ERP
     */
    async syncUsers(userId: string): Promise<{ success: boolean; synced: number; failed: number }> {
        const logId = await this.createSyncLog('users', 'import', userId);
        let synced = 0;
        let failed = 0;

        try {
            if (!this.config) throw new Error('ERP não configurado');

            // Fetch users from ERP API
            const response = await fetch(`${this.config.api_url}/users`, {
                headers: this.getHeaders()
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const erpUsers: ERPUser[] = await response.json();
            const total = erpUsers.length;

            if (logId) {
                await this.updateSyncLog(logId, { records_total: total });
            }

            // Process each user
            for (const erpUser of erpUsers) {
                try {
                    // Check if user exists by erp_id
                    const { data: existing } = await supabase
                        .from('profiles')
                        .select('id')
                        .eq('erp_id', erpUser.erp_id)
                        .single();

                    if (existing) {
                        // Update existing user
                        await supabase
                            .from('profiles')
                            .update({
                                full_name: erpUser.full_name,
                                erp_synced_at: new Date().toISOString()
                            })
                            .eq('id', existing.id);
                    }
                    // Note: Creating new users requires auth - handled separately

                    synced++;
                } catch {
                    failed++;
                }
            }

            if (logId) {
                await this.updateSyncLog(logId, {
                    status: 'success',
                    records_synced: synced,
                    records_failed: failed
                });
            }

            toast.success(`Sincronização concluída: ${synced} usuários`);
            return { success: true, synced, failed };

        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : 'Erro desconhecido';

            if (logId) {
                await this.updateSyncLog(logId, {
                    status: 'error',
                    error_message: msg,
                    records_synced: synced,
                    records_failed: failed
                });
            }

            toast.error('Erro na sincronização: ' + msg);
            return { success: false, synced, failed };
        }
    }

    /**
     * Import departments/sectors from ERP
     */
    async syncDepartments(userId: string): Promise<{ success: boolean; synced: number; failed: number }> {
        const logId = await this.createSyncLog('departments', 'import', userId);
        let synced = 0;
        let failed = 0;

        try {
            if (!this.config) throw new Error('ERP não configurado');

            const response = await fetch(`${this.config.api_url}/departments`, {
                headers: this.getHeaders()
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const erpDepts: ERPDepartment[] = await response.json();
            const total = erpDepts.length;

            if (logId) {
                await this.updateSyncLog(logId, { records_total: total });
            }

            for (const dept of erpDepts) {
                try {
                    const { data: existing } = await supabase
                        .from('sectors')
                        .select('id')
                        .eq('erp_id', dept.erp_id)
                        .single();

                    if (existing) {
                        await supabase
                            .from('sectors')
                            .update({
                                name: dept.name,
                                erp_synced_at: new Date().toISOString()
                            })
                            .eq('id', existing.id);
                    } else {
                        await supabase
                            .from('sectors')
                            .insert([{
                                name: dept.name,
                                erp_id: dept.erp_id,
                                icon: 'Building2',
                                colorClass: 'from-slate-500 to-slate-600',
                                erp_synced_at: new Date().toISOString()
                            }]);
                    }

                    synced++;
                } catch {
                    failed++;
                }
            }

            if (logId) {
                await this.updateSyncLog(logId, {
                    status: 'success',
                    records_synced: synced,
                    records_failed: failed
                });
            }

            toast.success(`Sincronização concluída: ${synced} setores`);
            return { success: true, synced, failed };

        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : 'Erro desconhecido';

            if (logId) {
                await this.updateSyncLog(logId, {
                    status: 'error',
                    error_message: msg,
                    records_synced: synced,
                    records_failed: failed
                });
            }

            toast.error('Erro na sincronização: ' + msg);
            return { success: false, synced, failed };
        }
    }

    /**
     * Export ticket to ERP
     */
    async exportTicket(ticketId: string, userId: string): Promise<boolean> {
        const logId = await this.createSyncLog('tickets', 'export', userId);

        try {
            if (!this.config) throw new Error('ERP não configurado');

            // Get ticket data
            const { data: ticket, error } = await supabase
                .from('tickets')
                .select('*, sector:sectors(name, erp_id), requester:profiles!requester_id(full_name, erp_id)')
                .eq('id', ticketId)
                .single();

            if (error || !ticket) throw new Error('Ticket não encontrado');

            // Send to ERP
            const response = await fetch(`${this.config.api_url}/tickets`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({
                    title: ticket.title,
                    description: ticket.description,
                    priority: ticket.priority,
                    status: ticket.status,
                    department_id: ticket.sector?.erp_id,
                    requester_id: ticket.requester?.erp_id,
                    created_at: ticket.created_at
                })
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const result = await response.json();

            // Update ticket with ERP reference
            await supabase
                .from('tickets')
                .update({
                    erp_exported_at: new Date().toISOString(),
                    erp_reference: result.reference || result.id
                })
                .eq('id', ticketId);

            if (logId) {
                await this.updateSyncLog(logId, {
                    status: 'success',
                    records_total: 1,
                    records_synced: 1
                });
            }

            toast.success('Ticket exportado para o ERP!');
            return true;

        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : 'Erro desconhecido';

            if (logId) {
                await this.updateSyncLog(logId, {
                    status: 'error',
                    error_message: msg,
                    records_total: 1,
                    records_failed: 1
                });
            }

            toast.error('Erro ao exportar: ' + msg);
            return false;
        }
    }

    /**
     * Get sync history
     */
    async getSyncHistory(limit = 20): Promise<SyncLog[]> {
        try {
            const { data, error } = await supabase
                .from('erp_sync_log')
                .select('*')
                .order('started_at', { ascending: false })
                .limit(limit);

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching sync history:', error);
            return [];
        }
    }
}

// Singleton instance
export const erpConnector = new ERPConnector();

export default ERPConnector;
