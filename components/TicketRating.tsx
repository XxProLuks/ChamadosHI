import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { Star, Send, CheckCircle2, Loader2 } from 'lucide-react';

interface TicketRatingProps {
    ticketId: string;
    existingRating?: number;
    existingComment?: string;
    onRatingSubmit: (rating: number, comment: string) => void;
}

const TicketRating: React.FC<TicketRatingProps> = ({
    ticketId,
    existingRating,
    existingComment,
    onRatingSubmit
}) => {
    const [rating, setRating] = useState(existingRating || 0);
    const [hover, setHover] = useState(0);
    const [comment, setComment] = useState(existingComment || '');
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(!!existingRating);

    const handleSubmit = async () => {
        if (rating === 0 || submitting) return;

        setSubmitting(true);
        const { error } = await supabase
            .from('tickets')
            .update({
                rating,
                rating_comment: comment
            })
            .eq('id', ticketId);

        if (!error) {
            setSubmitted(true);
            onRatingSubmit(rating, comment);
        } else {
            toast.error('Erro ao enviar avaliação: ' + error.message);
        }
        setSubmitting(false);
    };

    if (submitted) {
        return (
            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-[2rem] p-8 border border-emerald-100 dark:border-emerald-800/30 text-center animate-in zoom-in-95 duration-300">
                <div className="w-16 h-16 rounded-2xl bg-white dark:bg-emerald-800 flex items-center justify-center text-emerald-500 mx-auto mb-4 shadow-xl shadow-emerald-200/50">
                    <CheckCircle2 size={32} />
                </div>
                <h4 className="text-lg font-black text-slate-800 dark:text-white mb-2">Avaliação Enviada!</h4>
                <div className="flex justify-center gap-1 mb-3">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                            key={star}
                            size={20}
                            className={star <= rating ? "fill-amber-400 text-amber-400" : "text-slate-200 dark:text-slate-700"}
                        />
                    ))}
                </div>
                {comment && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 italic">"{comment}"</p>
                )}
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-8 border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50">
            <h4 className="text-lg font-black text-slate-800 dark:text-white mb-1 text-center">Como foi o atendimento?</h4>
            <p className="text-xs text-slate-400 mb-6 text-center font-bold uppercase tracking-widest">Sua opinião ajuda a melhorar o hospital</p>

            {/* Stars */}
            <div className="flex justify-center gap-3 mb-8" role="radiogroup" aria-label="Avaliação do atendimento">
                {[1, 2, 3, 4, 5].map((star) => (
                    <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHover(star)}
                        onMouseLeave={() => setHover(0)}
                        className="transition-all hover:scale-125 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 rounded-full"
                        aria-label={`${star} ${star === 1 ? 'estrela' : 'estrelas'}`}
                        aria-pressed={rating === star}
                        role="radio"
                        aria-checked={rating === star}
                    >
                        <Star
                            size={40}
                            className={`transition-colors ${(hover || rating) >= star
                                ? "fill-amber-400 text-amber-400"
                                : "text-slate-200 dark:text-slate-700"
                                }`}
                        />
                    </button>
                ))}
            </div>

            {/* Comment */}
            <div className="space-y-4">
                <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Deixe um comentário sobre o atendimento (opcional)..."
                    className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-3xl text-sm font-medium text-slate-700 dark:text-white placeholder-slate-400 focus:border-blue-400 outline-none transition-all resize-none h-24"
                    aria-label="Comentário sobre o atendimento (opcional)"
                />

                <button
                    onClick={handleSubmit}
                    disabled={rating === 0 || submitting}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-sm uppercase tracking-widest py-5 rounded-2xl shadow-xl shadow-blue-200 dark:shadow-blue-900/30 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
                    aria-label={submitting ? "Enviando avaliação..." : "Enviar avaliação"}
                >
                    {submitting ? (
                        <Loader2 size={20} className="animate-spin" />
                    ) : (
                        <>
                            <Send size={18} />
                            Enviar Avaliação
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};

export default TicketRating;
