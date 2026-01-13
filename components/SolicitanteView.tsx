import React from 'react';
import { Sector, Ticket } from '../types';
import MyTickets from './MyTickets';
import {
  Search, X, AlertCircle, Building, Zap, Pill, FlaskConical, Heart, Scan, Cpu, Activity,
  AlertTriangle, WifiOff, Droplets, Printer, Snowflake, Stethoscope, Syringe, Baby,
  Monitor, Bed, Phone, ClipboardList, Users, Settings, HelpCircle, LucideIcon, Receipt
} from 'lucide-react';

// Mapeamento de nomes de ícones para componentes Lucide
const iconMap: Record<string, LucideIcon> = {
  // Lucide icons (nomes diretos)
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
  // Material Symbols -> Lucide equivalents
  'apartment': Building,
  'medical_services': Stethoscope,
  'local_pharmacy': Pill,
  'bed': Bed,
  'biotech': FlaskConical,
  'emergency': Zap,
  'desk': Phone,
  'monitor_heart': Activity,
  'warning': AlertTriangle,
  'wifi_off': WifiOff,
  'water_drop': Droplets,
  'print': Printer,
  'ac_unit': Snowflake,
};

const SectorIcon: React.FC<{ iconName: string; className?: string }> = ({ iconName, className = '' }) => {
  const IconComponent = iconMap[iconName] || HelpCircle;
  return <IconComponent size={32} strokeWidth={1.5} className={className} />;
};

interface SolicitanteViewProps {
  sectors: Sector[];
  onSelectSector: (sector: Sector) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  tickets: Ticket[];
  onViewTicketDetails: (ticket: Ticket) => void;
  requesterName: string;
  hasMore?: boolean;
  onLoadMore?: () => void;
}

const SolicitanteView: React.FC<SolicitanteViewProps> = ({
  sectors,
  onSelectSector,
  searchQuery,
  onSearchChange,
  tickets,
  onViewTicketDetails,
  requesterName,
  hasMore,
  onLoadMore
}) => {
  const filteredSectors = sectors.filter(sector =>
    sector.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 flex flex-col gap-8 animate-in fade-in duration-500">
      {/* Floating Training Button */}
      <div className="fixed top-28 left-6 z-[40] animate-in slide-in-from-left duration-700">
        <div className="absolute inset-0 bg-blue-400 rounded-full animate-ping opacity-20" />
        <a
          href="POP Treinamento.html"
          target="_blank"
          rel="noopener noreferrer"
          className="relative flex items-center gap-3 px-5 py-3 bg-white dark:bg-slate-800 border-2 border-blue-100 dark:border-blue-900/50 text-blue-600 dark:text-blue-400 font-black text-[10px] uppercase tracking-[0.2em] rounded-full shadow-2xl hover:scale-110 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all duration-300 group ring-4 ring-blue-50 dark:ring-blue-900/20"
        >
          <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/40 flex items-center justify-center group-hover:bg-white/20 transition-colors">
            <HelpCircle size={18} className="group-hover:rotate-12 transition-transform" />
          </div>
          <span className="pr-2">Treinamento</span>
        </a>
      </div>

      <div className="text-center pt-4">
        <h2 className="text-2xl sm:text-4xl font-black text-slate-800 mb-3 tracking-tight">
          Olá, <span className="text-blue-600">{requesterName.split(' ')[0]}</span>.
        </h2>
        <p className="text-slate-500 font-medium text-lg">
          Onde o hospital precisa de ajuda hoje?
        </p>
      </div>

      <div className="relative w-full max-w-2xl mx-auto group">
        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
          <Search size={20} className="text-slate-400 group-focus-within:text-blue-500 transition-colors" />
        </div>
        <input
          className="block w-full pl-14 pr-4 py-5 bg-white border-2 border-slate-100 rounded-3xl text-slate-900 placeholder-slate-400 focus:ring-4 focus:ring-blue-50 focus:border-blue-400 shadow-xl shadow-slate-200/40 hover:shadow-2xl hover:shadow-slate-200/60 transition-all duration-300 outline-none text-lg"
          placeholder="Busque por um setor (ex: UTI, Farmácia)..."
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute inset-y-0 right-0 pr-5 flex items-center"
          >
            <X size={20} className="text-slate-400 hover:text-slate-600" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-5">
        {filteredSectors.map((sector) => (
          <button
            key={sector.id}
            onClick={() => onSelectSector(sector)}
            className="group flex flex-col items-center justify-center p-6 bg-white border border-slate-100 rounded-[2.5rem] shadow-sm hover:shadow-2xl hover:border-blue-100 hover:-translate-y-2 transition-all duration-500 aspect-square"
          >
            <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center mb-4 transition-all duration-500 ${sector.colorClass} group-hover:scale-110 group-hover:rotate-6`}>
              <SectorIcon iconName={sector.icon} />
            </div>
            <span className="text-sm sm:text-base font-bold text-slate-700 group-hover:text-blue-600 transition-colors">
              {sector.name}
            </span>
          </button>
        ))}
        {filteredSectors.length === 0 && (
          <div className="col-span-full text-center py-16 bg-white/50 border-2 border-dashed border-slate-200 rounded-[2.5rem]">
            <Search size={48} className="mx-auto text-slate-300 mb-4" />
            <p className="font-bold text-slate-500">Nenhum setor encontrado para "{searchQuery}"</p>
          </div>
        )}
      </div>

      {/* My Tickets Section */}
      <MyTickets
        tickets={tickets}
        onViewDetails={onViewTicketDetails}
        requesterName={requesterName}
        hasMore={hasMore}
        onLoadMore={onLoadMore}
      />

    </div>
  );
};

export default SolicitanteView;
