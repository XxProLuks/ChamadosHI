import React, { useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { Sector, TicketCategory, Ticket, Priority } from '../types';
import { supabase } from '../lib/supabase';
import {
  X, AlertCircle, MapPin, Info, Camera, Send, Zap, Loader2, Building, Pill,
  FlaskConical, Heart, Scan, Cpu, Activity, Stethoscope, Syringe, Baby,
  Monitor, Bed, Phone, ClipboardList, Users, Settings, HelpCircle, LucideIcon, Receipt, Trash2
} from 'lucide-react';

// Mapeamento de nomes de ícones para componentes Lucide
const iconMap: Record<string, LucideIcon> = {
  'Building': Building,
  'Zap': Zap,
  'Pill': Pill,
  'FlaskConical': FlaskConical,
  'Heart': Heart,
  'Scan': Scan,
  'Cpu': Cpu,
  'Activity': Activity,
  'Stethoscope': Stethoscope,
  'Syringe': Syringe,
  'Baby': Baby,
  'Monitor': Monitor,
  'Bed': Bed,
  'Phone': Phone,
  'ClipboardList': ClipboardList,
  'Users': Users,
  'Settings': Settings,
  'Receipt': Receipt,
  'apartment': Building,
  'medical_services': Stethoscope,
  'local_pharmacy': Pill,
  'bed': Bed,
  'biotech': FlaskConical,
  'emergency': Zap,
  'desk': Phone,
  'monitor_heart': Activity,
};

const SectorIcon: React.FC<{ iconName: string; size?: number }> = ({ iconName, size = 24 }) => {
  const IconComponent = iconMap[iconName] || HelpCircle;
  return <IconComponent size={size} strokeWidth={1.5} />;
};

interface TicketModalProps {
  sector: Sector | null;
  onClose: () => void;
  onSubmit: (ticket: Partial<Ticket>) => void;
  prefillTitle?: string;
  prefillCategory?: TicketCategory;
}

const priorityOptions: { value: Priority; label: string; color: string; icon: any }[] = [
  { value: 'LOW', label: 'Baixa', color: 'bg-emerald-50 text-emerald-600 border-emerald-100', icon: Zap },
  { value: 'MEDIUM', label: 'Média', color: 'bg-blue-50 text-blue-600 border-blue-100', icon: Info },
  { value: 'HIGH', label: 'Alta', color: 'bg-orange-50 text-orange-600 border-orange-100', icon: AlertCircle },
  { value: 'CRITICAL', label: 'Crítica', color: 'bg-rose-50 text-rose-600 border-rose-100', icon: AlertCircle }
];

const TicketModal: React.FC<TicketModalProps> = ({ sector, onClose, onSubmit, prefillTitle = '', prefillCategory }) => {
  const [formData, setFormData] = useState({
    title: prefillTitle,
    description: '',
    category: (prefillCategory || 'CHAMADO') as TicketCategory,
    priority: 'MEDIUM' as Priority
  });
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || uploading) return;

    setUploading(true);
    const publicUrls: string[] = [];

    try {
      if (selectedFiles.length > 0) {
        await Promise.all((selectedFiles as File[]).map(async (file) => {
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

      onSubmit({
        ...formData,
        sector_id: sector?.id,
        is_critical: formData.priority === 'CRITICAL',
        image_urls: publicUrls,
        image_url: publicUrls[0] || undefined // Backward compatibility
      });
    } catch (error: any) {
      toast.error('Erro ao enviar imagens: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      const validFiles = (files as File[]).filter(file => {
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`Imagem ${file.name} muito grande. Máximo: 5MB`);
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

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/80 backdrop-blur-md transition-opacity animate-in fade-in duration-500"
        onClick={onClose}
      />

      <div className={`relative w-full max-w-xl bg-white rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[95vh]`}>

        {/* Header */}
        <div className={`flex items-center justify-between px-10 py-8 bg-slate-50`}>
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center bg-blue-600 text-white shadow-lg shadow-blue-200`}>
              <Zap size={32} />
            </div>
            <div>
              <h3 className={`text-2xl font-black tracking-tight text-slate-800`}>
                Novo Chamado
              </h3>
              <p className={`text-sm font-bold opacity-70 text-slate-500`}>
                Detalhe sua solicitação abaixo
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:bg-white hover:text-slate-600 transition-all shadow-sm"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-10 py-8 space-y-8 no-scrollbar">

          {/* Section: Sector Info */}
          <div className="flex items-center gap-4 p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-white text-blue-600 shadow-sm`}>
              <SectorIcon iconName={sector?.icon || 'Building'} />
            </div>
            <div>
              <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Setor</p>
              <p className="text-lg font-black text-blue-700">{sector?.name || 'Geral'}</p>
            </div>
          </div>

          {/* Input: Title */}
          <div className="space-y-3">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Assunto do Chamado</label>
            <div className="relative group">
              <input
                required
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl py-5 px-6 text-lg font-black text-slate-800 focus:bg-white focus:border-blue-400 focus:shadow-2xl focus:shadow-blue-100/50 outline-none transition-all duration-300"
                placeholder="O que está acontecendo?"
              />
            </div>
          </div>

          {/* Priority Toggles */}
          <div className="space-y-3">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Prioridade</label>
            <div className="grid grid-cols-4 gap-3">
              {priorityOptions.map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, priority: option.value })}
                  className={`flex flex-col items-center gap-2 p-4 rounded-[1.5rem] border-2 transition-all duration-300 ${formData.priority === option.value
                    ? `${option.color} border-current shadow-xl scale-105`
                    : 'bg-white border-slate-50 text-slate-400 hover:bg-slate-50'
                    }`}
                >
                  <option.icon size={20} />
                  <span className="text-[10px] font-black">{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Textarea: Description */}
          <div className="space-y-3">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Detalhes Adicionais</label>
            <textarea
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl py-4 px-6 text-base font-bold text-slate-700 focus:bg-white focus:border-blue-400 focus:shadow-2xl focus:shadow-blue-100/50 outline-none transition-all duration-300 h-32 no-scrollbar"
              placeholder="Descreva o problema com mais detalhes..."
            />
          </div>

          {/* Attachment */}
          <div className="space-y-3">
            <div className="flex justify-between items-center ml-1">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Evidências (Fotos)</label>
              <span className="text-[10px] font-bold text-slate-400 uppercase">{imagePreviews.length} anexo(s)</span>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              multiple
              onChange={handleImageUpload}
              className="hidden"
              aria-label="Selecionar imagens de evidência"
            />

            <div className="grid grid-cols-2 gap-4">
              {imagePreviews.map((preview, idx) => (
                <div key={idx} className="relative rounded-3xl overflow-hidden shadow-xl border-4 border-white ring-1 ring-slate-100 group aspect-video">
                  <img src={preview} alt={`Evidência ${idx + 1}`} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="absolute top-2 right-2 w-8 h-8 bg-rose-500 text-white rounded-full flex items-center justify-center hover:bg-rose-600 shadow-xl transition-all hover:scale-110"
                    aria-label={`Remover evidência ${idx + 1}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-2 rounded-3xl border-4 border-dashed border-slate-100 bg-slate-50/50 text-slate-400 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-500 transition-all duration-300 aspect-video"
                aria-label="Adicionar foto de evidência"
              >
                <Camera size={24} strokeWidth={1.5} />
                <span className="font-black text-[10px] uppercase tracking-widest">Anexar Foto</span>
              </button>
            </div>
          </div>
        </form>

        {/* Footer Actions */}
        <div className={`p-10 border-t flex gap-4 bg-slate-50 border-slate-100`}>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-5 rounded-[1.5rem] bg-white text-slate-500 font-black text-sm uppercase tracking-widest shadow-sm hover:bg-slate-100 transition-all"
            aria-label="Cancelar criação do chamado"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={uploading}
            className={`flex-[2] py-5 rounded-[1.5rem] font-black text-sm uppercase tracking-widest shadow-2xl transition-all flex items-center justify-center gap-3 active:scale-[0.98] bg-blue-600 text-white shadow-blue-200 hover:bg-blue-700 ${uploading ? 'opacity-50 cursor-wait' : ''}`}
            aria-label={uploading ? "Enviando chamado..." : "Abrir chamado"}
          >
            {uploading ? (
              <>
                Enviando... <Loader2 className="animate-spin" size={18} />
              </>
            ) : (
              <>
                Abrir Chamado
                <Send size={18} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TicketModal;
