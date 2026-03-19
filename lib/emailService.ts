/**
 * Email Service for internal notifications
 * Uses SMTP to send emails when ticket events occur
 */

export interface EmailConfig {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    pass: string;
    from: string;
}

export interface EmailMessage {
    to: string;
    subject: string;
    html: string;
    text?: string;
}

// NOTE: SMTP configuration is handled server-side by the Supabase Edge Function.
// Do NOT expose SMTP credentials in the frontend bundle.

/**
 * Escapes HTML special characters to prevent XSS in email templates
 */
function escapeHtml(unsafe: string): string {
    return unsafe
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Email templates for different notification types
 */
export const emailTemplates = {
    ticketCreated: (ticketTitle: string, ticketId: string, requesterName: string, location: string) => ({
        subject: `🆕 Novo Chamado: ${escapeHtml(ticketTitle)}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #3b82f6, #1e40af); padding: 20px; border-radius: 10px 10px 0 0;">
                    <h1 style="color: white; margin: 0; font-size: 24px;">🏥 Sistema de Chamados</h1>
                </div>
                <div style="background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0;">
                    <h2 style="color: #1e293b; margin-top: 0;">Novo Chamado Criado</h2>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; color: #64748b;">Título:</td>
                            <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; font-weight: bold;">${escapeHtml(ticketTitle)}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; color: #64748b;">Solicitante:</td>
                            <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0;">${escapeHtml(requesterName)}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; color: #64748b;">Local:</td>
                            <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0;">${escapeHtml(location)}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 0; color: #64748b;">ID:</td>
                            <td style="padding: 10px 0; font-family: monospace; font-size: 12px;">${escapeHtml(ticketId)}</td>
                        </tr>
                    </table>
                    <div style="margin-top: 20px; text-align: center;">
                        <a href="#" style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Ver Chamado</a>
                    </div>
                </div>
                <div style="background: #1e293b; padding: 15px; border-radius: 0 0 10px 10px; text-align: center;">
                    <p style="color: #94a3b8; margin: 0; font-size: 12px;">Hospital de Ilhéus - Sistema de Chamados</p>
                </div>
            </div>
        `,
        text: `Novo Chamado: ${ticketTitle}\nSolicitante: ${requesterName}\nLocal: ${location}\nID: ${ticketId}`
    }),

    statusChanged: (ticketTitle: string, oldStatus: string, newStatus: string, technicianName?: string) => ({
        subject: `🔄 Status Atualizado: ${escapeHtml(ticketTitle)}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #3b82f6, #1e40af); padding: 20px; border-radius: 10px 10px 0 0;">
                    <h1 style="color: white; margin: 0; font-size: 24px;">🏥 Sistema de Chamados</h1>
                </div>
                <div style="background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0;">
                    <h2 style="color: #1e293b; margin-top: 0;">Status do Chamado Atualizado</h2>
                    <p style="color: #475569;"><strong>${escapeHtml(ticketTitle)}</strong></p>
                    <div style="display: flex; align-items: center; justify-content: center; margin: 20px 0;">
                        <span style="background: #fee2e2; color: #991b1b; padding: 8px 16px; border-radius: 20px;">${escapeHtml(oldStatus)}</span>
                        <span style="margin: 0 10px; color: #64748b;">→</span>
                        <span style="background: #dcfce7; color: #166534; padding: 8px 16px; border-radius: 20px;">${escapeHtml(newStatus)}</span>
                    </div>
                    ${technicianName ? `<p style="color: #64748b; text-align: center;">Técnico responsável: <strong>${escapeHtml(technicianName)}</strong></p>` : ''}
                </div>
                <div style="background: #1e293b; padding: 15px; border-radius: 0 0 10px 10px; text-align: center;">
                    <p style="color: #94a3b8; margin: 0; font-size: 12px;">Hospital de Ilhéus - Sistema de Chamados</p>
                </div>
            </div>
        `,
        text: `Chamado: ${ticketTitle}\nStatus alterado de ${oldStatus} para ${newStatus}${technicianName ? `\nTécnico: ${technicianName}` : ''}`
    }),

    newMessage: (ticketTitle: string, senderName: string, messagePreview: string) => ({
        subject: `💬 Nova Mensagem: ${escapeHtml(ticketTitle)}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #3b82f6, #1e40af); padding: 20px; border-radius: 10px 10px 0 0;">
                    <h1 style="color: white; margin: 0; font-size: 24px;">🏥 Sistema de Chamados</h1>
                </div>
                <div style="background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0;">
                    <h2 style="color: #1e293b; margin-top: 0;">Nova Mensagem no Chamado</h2>
                    <p style="color: #475569;"><strong>${escapeHtml(ticketTitle)}</strong></p>
                    <div style="background: white; border-left: 4px solid #3b82f6; padding: 15px; margin: 15px 0;">
                        <p style="color: #64748b; margin: 0 0 5px 0; font-size: 12px;"><strong>${escapeHtml(senderName)}</strong> escreveu:</p>
                        <p style="color: #1e293b; margin: 0;">${escapeHtml(messagePreview)}</p>
                    </div>
                    <div style="margin-top: 20px; text-align: center;">
                        <a href="#" style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Responder</a>
                    </div>
                </div>
                <div style="background: #1e293b; padding: 15px; border-radius: 0 0 10px 10px; text-align: center;">
                    <p style="color: #94a3b8; margin: 0; font-size: 12px;">Hospital de Ilhéus - Sistema de Chamados</p>
                </div>
            </div>
        `,
        text: `Nova mensagem em: ${ticketTitle}\n${senderName} escreveu: ${messagePreview}`
    }),

    ticketCompleted: (ticketTitle: string, technicianName: string) => ({
        subject: `✅ Chamado Concluído: ${escapeHtml(ticketTitle)}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #10b981, #047857); padding: 20px; border-radius: 10px 10px 0 0;">
                    <h1 style="color: white; margin: 0; font-size: 24px;">✅ Chamado Concluído</h1>
                </div>
                <div style="background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0;">
                    <h2 style="color: #1e293b; margin-top: 0;">${escapeHtml(ticketTitle)}</h2>
                    <p style="color: #475569;">Seu chamado foi concluído por <strong>${escapeHtml(technicianName)}</strong>.</p>
                    <div style="background: #dcfce7; border-radius: 10px; padding: 20px; text-align: center; margin: 20px 0;">
                        <p style="color: #166534; margin: 0 0 10px 0;">Por favor, avalie o atendimento:</p>
                        <div style="font-size: 30px;">⭐⭐⭐⭐⭐</div>
                    </div>
                    <div style="margin-top: 20px; text-align: center;">
                        <a href="#" style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Avaliar Atendimento</a>
                    </div>
                </div>
                <div style="background: #1e293b; padding: 15px; border-radius: 0 0 10px 10px; text-align: center;">
                    <p style="color: #94a3b8; margin: 0; font-size: 12px;">Hospital de Ilhéus - Sistema de Chamados</p>
                </div>
            </div>
        `,
        text: `Chamado concluído: ${ticketTitle}\nTécnico: ${technicianName}\nPor favor, avalie o atendimento.`
    })
};

import { supabase } from './supabase';

/**
 * Queue email for sending via Edge Function
 * Calls a Supabase Edge Function that handles SMTP
 */
export async function queueEmail(message: EmailMessage): Promise<boolean> {
    try {
        const { error } = await supabase.functions.invoke('send-email', {
            body: { message }
        });

        if (error) {
            return false;
        }

        return true;
    } catch {
        return false;
    }
}

/**
 * Send notification emails for ticket events
 */
export const notifyByEmail = {
    ticketCreated: async (
        technicianEmails: string[],
        ticketTitle: string,
        ticketId: string,
        requesterName: string,
        location: string
    ) => {
        const template = emailTemplates.ticketCreated(ticketTitle, ticketId, requesterName, location);
        await Promise.all(technicianEmails.map(email => queueEmail({ to: email, ...template })));
    },

    statusChanged: async (
        recipientEmail: string,
        ticketTitle: string,
        oldStatus: string,
        newStatus: string,
        technicianName?: string
    ) => {
        const template = emailTemplates.statusChanged(ticketTitle, oldStatus, newStatus, technicianName);
        await queueEmail({ to: recipientEmail, ...template });
    },

    newMessage: async (
        recipientEmail: string,
        ticketTitle: string,
        senderName: string,
        messagePreview: string
    ) => {
        const template = emailTemplates.newMessage(ticketTitle, senderName, messagePreview);
        await queueEmail({ to: recipientEmail, ...template });
    },

    ticketCompleted: async (
        requesterEmail: string,
        ticketTitle: string,
        technicianName: string
    ) => {
        const template = emailTemplates.ticketCompleted(ticketTitle, technicianName);
        await queueEmail({ to: requesterEmail, ...template });
    }
};

export default notifyByEmail;
