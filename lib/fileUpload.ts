import { supabase } from './supabase';
import toast from 'react-hot-toast';

// Allowed file types for document uploads
const ALLOWED_TYPES = {
    // Documents
    'application/pdf': '.pdf',
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'application/vnd.ms-excel': '.xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
    'text/plain': '.txt',
    'text/csv': '.csv',
    // Images (keep existing support)
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp'
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export interface UploadResult {
    success: boolean;
    url?: string;
    filename?: string;
    fileType?: string;
    fileSize?: number;
    error?: string;
}

export interface Attachment {
    id: string;
    ticket_id?: string;
    message_id?: string;
    filename: string;
    file_url: string;
    file_type: string;
    file_size: number;
    uploaded_by?: string;
    created_at: string;
}

/**
 * Validates file type and size before upload
 */
export function validateFile(file: File): { valid: boolean; error?: string } {
    if (!ALLOWED_TYPES[file.type as keyof typeof ALLOWED_TYPES]) {
        return {
            valid: false,
            error: `Tipo de arquivo não suportado: ${file.type}. Use: PDF, DOC, DOCX, XLS, XLSX, TXT, CSV ou imagens.`
        };
    }

    if (file.size > MAX_FILE_SIZE) {
        return {
            valid: false,
            error: `Arquivo muito grande: ${(file.size / 1024 / 1024).toFixed(2)}MB. Máximo: 10MB`
        };
    }

    return { valid: true };
}

/**
 * Uploads a document to Supabase Storage
 */
export async function uploadDocument(
    file: File,
    ticketId?: string,
    userId?: string
): Promise<UploadResult> {
    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
        return { success: false, error: validation.error };
    }

    try {
        // Generate unique filename
        const timestamp = Date.now();
        const ext = ALLOWED_TYPES[file.type as keyof typeof ALLOWED_TYPES] || '';
        const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filename = `${ticketId || 'general'}/${timestamp}_${sanitizedName}`;

        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
            .from('documents')
            .upload(filename, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (error) throw error;

        // Get public URL
        const { data: urlData } = supabase.storage
            .from('documents')
            .getPublicUrl(data.path);

        return {
            success: true,
            url: urlData.publicUrl,
            filename: file.name,
            fileType: file.type,
            fileSize: file.size
        };
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Erro desconhecido';
        console.error('Upload error:', msg);
        return { success: false, error: msg };
    }
}

/**
 * Saves attachment metadata to database
 */
export async function saveAttachment(
    attachment: Omit<Attachment, 'id' | 'created_at'>,
    userId: string
): Promise<Attachment | null> {
    try {
        const { data, error } = await supabase
            .from('attachments')
            .insert([{
                ...attachment,
                uploaded_by: userId
            }])
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Erro desconhecido';
        toast.error('Erro ao salvar anexo: ' + msg);
        return null;
    }
}

/**
 * Gets attachments for a ticket
 */
export async function getTicketAttachments(ticketId: string): Promise<Attachment[]> {
    try {
        const { data, error } = await supabase
            .from('attachments')
            .select('*')
            .eq('ticket_id', ticketId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching attachments:', error);
        return [];
    }
}

/**
 * Gets file icon based on type
 */
export function getFileIcon(fileType: string): string {
    if (fileType.startsWith('image/')) return '🖼️';
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('word') || fileType.includes('document')) return '📝';
    if (fileType.includes('excel') || fileType.includes('spreadsheet')) return '📊';
    if (fileType.includes('csv')) return '📋';
    if (fileType.includes('text')) return '📃';
    return '📎';
}

/**
 * Formats file size for display
 */
export function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

/**
 * Checks if file type is an image
 */
export function isImage(fileType: string): boolean {
    return fileType.startsWith('image/');
}
