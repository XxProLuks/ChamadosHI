import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import DOMPurify from 'dompurify';
import { supabase } from '../lib/supabase';
import { Send, Loader2, User, Wrench, Image, X } from 'lucide-react';
import notifyByEmail from '../lib/emailService';

interface Message {
    id: string;
    ticket_id: string;
    user_id: string;
    message: string;
    image_url?: string;
    image_urls?: string[];
    created_at: string;
    user?: {
        full_name: string;
        role: string;
    };
}

interface TicketChatProps {
    ticketId: string;
    currentUserId: string;
    currentUserName: string;
    currentUserRole: string;
}

const TicketChat: React.FC<TicketChatProps> = ({ ticketId, currentUserId, currentUserName, currentUserRole }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);
    const [isTyping, setIsTyping] = useState(false);
    const [otherUserTyping, setOtherUserTyping] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        fetchMessages();

        // Subscribe to new messages
        const messagesChannel = supabase
            .channel(`ticket_messages_${ticketId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'ticket_messages',
                    filter: `ticket_id=eq.${ticketId}`
                },
                async (payload) => {
                    const { data: userData } = await supabase
                        .from('profiles')
                        .select('full_name, role')
                        .eq('id', payload.new.user_id)
                        .single();

                    const newMsg = {
                        ...payload.new,
                        user: userData
                    } as Message;

                    setMessages(prev => [...prev, newMsg]);
                }
            )
            .subscribe();

        // Subscribe to typing indicator
        const typingChannel = supabase
            .channel(`typing_${ticketId}`)
            .on('broadcast', { event: 'typing' }, (payload) => {
                if (payload.payload.userId !== currentUserId) {
                    setOtherUserTyping(payload.payload.userName);
                    setTimeout(() => setOtherUserTyping(null), 3000);
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(messagesChannel);
            supabase.removeChannel(typingChannel);
        };
    }, [ticketId, currentUserId]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const fetchMessages = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('ticket_messages')
            .select(`*, user:profiles!user_id(full_name, role)`)
            .eq('ticket_id', ticketId)
            .order('created_at', { ascending: true });

        if (data) {
            setMessages(data);
        }
        setLoading(false);
    };

    const handleTyping = () => {
        if (!isTyping) {
            setIsTyping(true);
            supabase.channel(`typing_${ticketId}`).send({
                type: 'broadcast',
                event: 'typing',
                payload: { userId: currentUserId, userName: currentUserName }
            });
        }

        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        typingTimeoutRef.current = setTimeout(() => {
            setIsTyping(false);
        }, 2000);
    };

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length > 0) {
            const validFiles = files.filter(file => {
                if (file.size > 5 * 1024 * 1024) {
                    toast.error(`Imagem ${file.name} muito grande. Máximo 5MB.`);
                    return false;
                }
                return true;
            });

            setSelectedFiles(prev => [...prev, ...validFiles]);

            validFiles.forEach(file => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    setImagePreviews(prev => [...prev, reader.result as string]);
                };
                reader.readAsDataURL(file);
            });
        }
    };

    const removeImage = (index: number) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
        setImagePreviews(prev => prev.filter((_, i) => i !== index));
    };

    const handleSend = async () => {
        if ((!newMessage.trim() && selectedFiles.length === 0) || sending) return;

        setSending(true);
        const publicUrls: string[] = [];

        try {
            if (selectedFiles.length > 0) {
                await Promise.all(selectedFiles.map(async (file) => {
                    const fileExt = file.name.split('.').pop();
                    const fileName = `${Math.random()}.${fileExt}`;
                    const filePath = `${fileName}`;

                    const { error: uploadError } = await supabase.storage
                        .from('ticket-images')
                        .upload(filePath, file);

                    if (uploadError) throw uploadError;

                    const { data } = supabase.storage
                        .from('ticket-images')
                        .getPublicUrl(filePath);

                    publicUrls.push(data.publicUrl);
                }));
            }

            const { error } = await supabase
                .from('ticket_messages')
                .insert([{
                    ticket_id: ticketId,
                    user_id: currentUserId,
                    message: newMessage.trim() || (publicUrls.length > 0 ? `📷 ${publicUrls.length} Foto(s)` : ''),
                    image_urls: publicUrls,
                    image_url: publicUrls[0] || null // Backward compatibility
                }]);

            if (!error) {
                setNewMessage('');
                setSelectedFiles([]);
                setImagePreviews([]);
                inputRef.current?.focus();

                // Notificar a outra parte por email
                const { data: ticket } = await supabase
                    .from('tickets')
                    .select('title, requester_id, technician_id')
                    .eq('id', ticketId)
                    .single();

                if (ticket) {
                    const recipientId = currentUserId === ticket.requester_id
                        ? ticket.technician_id
                        : ticket.requester_id;

                    if (recipientId) {
                        const { data: recipientProfile } = await supabase
                            .from('profiles')
                            .select('email')
                            .eq('id', recipientId)
                            .single();

                        if (recipientProfile?.email) {
                            notifyByEmail.newMessage(
                                recipientProfile.email,
                                ticket.title,
                                currentUserName,
                                newMessage.trim() || '📷 Foto(s)'
                            );
                        }
                    }
                }
            } else {
                throw error;
            }
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
            toast.error('Erro ao enviar mensagem: ' + errorMessage);
        } finally {
            setSending(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const formatTime = (dateStr: string) => {
        return new Date(dateStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) return 'Hoje';
        if (date.toDateString() === yesterday.toDateString()) return 'Ontem';
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    };

    // Sanitize message content to prevent XSS
    const sanitizeMessage = (message: string): string => {
        return DOMPurify.sanitize(message, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
    };

    const groupedMessages: { date: string; messages: Message[] }[] = [];
    let currentDate = '';

    messages.forEach(msg => {
        const msgDate = new Date(msg.created_at).toDateString();
        if (msgDate !== currentDate) {
            currentDate = msgDate;
            groupedMessages.push({ date: msg.created_at, messages: [msg] });
        } else {
            const lastGroup = groupedMessages[groupedMessages.length - 1];
            if (lastGroup) {
                lastGroup.messages.push(msg);
            }
        }
    });

    return (
        <div className="flex flex-col h-96 bg-slate-50/50 dark:bg-slate-800/50 rounded-[2rem] border border-slate-100 dark:border-slate-700 overflow-hidden" role="region" aria-label="Chat do chamado">
            {/* Header */}
            <div className="px-6 py-4 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400" aria-hidden="true">
                    <Send size={20} />
                </div>
                <div className="flex-1">
                    <h4 className="font-black text-slate-800 dark:text-white text-sm">Conversa do Chamado</h4>
                    <p className="text-xs text-slate-400" aria-live="polite">
                        {otherUserTyping ? (
                            <span className="text-blue-500 animate-pulse">
                                {otherUserTyping} está digitando...
                            </span>
                        ) : (
                            `${messages.length} mensagens`
                        )}
                    </p>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar" role="log" aria-label="Mensagens">
                {loading ? (
                    <div className="flex items-center justify-center h-full">
                        <Loader2 size={32} className="animate-spin text-blue-500" aria-label="Carregando mensagens..." />
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                        <Send size={32} className="mb-2 opacity-50" aria-hidden="true" />
                        <p className="text-sm font-medium">Nenhuma mensagem ainda</p>
                        <p className="text-xs">Inicie a conversa!</p>
                    </div>
                ) : (
                    groupedMessages.map((group, groupIdx) => (
                        <div key={groupIdx}>
                            <div className="flex items-center justify-center my-4">
                                <span className="px-3 py-1 bg-white dark:bg-slate-700 rounded-full text-[10px] font-bold text-slate-400 uppercase tracking-wider shadow-sm border border-slate-100 dark:border-slate-600">
                                    {formatDate(group.date)}
                                </span>
                            </div>

                            {group.messages.map((msg) => {
                                const isOwn = msg.user_id === currentUserId;
                                const isTech = msg.user?.role === 'TECNICO' || msg.user?.role === 'ADMIN';
                                const images = msg.image_urls && msg.image_urls.length > 0 ? msg.image_urls : (msg.image_url ? [msg.image_url] : []);

                                return (
                                    <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-3`}>
                                        <div className={`max-w-[80%] ${isOwn ? 'order-2' : 'order-1'}`}>
                                            {!isOwn && (
                                                <div className="flex items-center gap-2 mb-1 px-3">
                                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${isTech ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`} aria-hidden="true">
                                                        {isTech ? <Wrench size={12} /> : <User size={12} />}
                                                    </div>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                                        {msg.user?.full_name || 'Usuário'}
                                                        {isTech && <span className="ml-1 text-blue-500">• Técnico</span>}
                                                    </span>
                                                </div>
                                            )}

                                            <div className={`px-5 py-3 rounded-3xl ${isOwn
                                                ? 'bg-blue-600 text-white rounded-br-lg'
                                                : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-bl-lg shadow-sm border border-slate-100 dark:border-slate-600'
                                                }`}>
                                                {images.length > 0 && (
                                                    <div className={`grid gap-2 mb-2 ${images.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                                                        {images.map((url, i) => (
                                                            <img
                                                                key={i}
                                                                src={url}
                                                                alt={`Imagem ${i + 1} da mensagem`}
                                                                className="w-full rounded-xl cursor-pointer hover:opacity-90 transition-opacity aspect-square object-cover"
                                                                onClick={() => window.open(url, '_blank')}
                                                            />
                                                        ))}
                                                    </div>
                                                )}
                                                {msg.message && !msg.message.includes('📷') && (
                                                    <p className="text-sm leading-relaxed">{sanitizeMessage(msg.message)}</p>
                                                )}
                                                <p className={`text-[10px] mt-1 ${isOwn ? 'text-blue-200' : 'text-slate-400'}`}>
                                                    {formatTime(msg.created_at)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Image Preview Grid */}
            {imagePreviews.length > 0 && (
                <div className="px-4 py-3 bg-slate-100 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
                    <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
                        {imagePreviews.map((preview, idx) => (
                            <div key={idx} className="relative flex-shrink-0">
                                <img src={preview} alt={`Preview ${idx + 1}`} className="h-16 w-16 object-cover rounded-xl border-2 border-white shadow-md" />
                                <button
                                    onClick={() => removeImage(idx)}
                                    className="absolute -top-2 -right-2 w-6 h-6 bg-rose-500 text-white rounded-full flex items-center justify-center hover:bg-rose-600 transition-colors shadow-lg"
                                    aria-label={`Remover imagem ${idx + 1}`}
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Input Area */}
            <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-700">
                <div className="flex gap-2">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageSelect}
                        accept="image/*"
                        multiple
                        className="hidden"
                        aria-label="Selecionar imagens"
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                        aria-label="Anexar imagem"
                    >
                        <Image size={20} />
                    </button>
                    <input
                        ref={inputRef}
                        type="text"
                        value={newMessage}
                        onChange={(e) => {
                            setNewMessage(e.target.value);
                            handleTyping();
                        }}
                        onKeyPress={handleKeyPress}
                        placeholder="Digite sua mensagem..."
                        className="flex-1 px-5 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white placeholder-slate-400 focus:border-blue-400 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all font-medium text-sm"
                        aria-label="Mensagem"
                    />
                    <button
                        onClick={handleSend}
                        disabled={(!newMessage.trim() && selectedFiles.length === 0) || sending}
                        className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-200 dark:shadow-blue-900/30"
                        aria-label="Enviar mensagem"
                    >
                        {sending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TicketChat;
