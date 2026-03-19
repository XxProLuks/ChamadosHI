import React, { useState } from 'react';
import { UserPlus, ChevronDown } from 'lucide-react';
import { Profile } from '../types';

interface TicketAssignerProps {
  technicians: Profile[];
  currentTechnicianId?: string;
  onAssign: (technicianId: string) => void;
}

const TicketAssigner: React.FC<TicketAssignerProps> = ({ technicians, currentTechnicianId, onAssign }) => {
  const [open, setOpen] = useState(false);
  const currentTech = technicians.find(t => t.id === currentTechnicianId);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
      >
        <UserPlus size={14} />
        {currentTech ? currentTech.full_name : 'Atribuir'}
        <ChevronDown size={14} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg py-1">
          {technicians.map(tech => (
            <button
              key={tech.id}
              onClick={() => { onAssign(tech.id); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 ${
                tech.id === currentTechnicianId ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600' : 'text-slate-700 dark:text-slate-300'
              }`}
            >
              {tech.full_name}
              {tech.is_available === false && <span className="text-xs text-slate-400 ml-1">(indisponível)</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default TicketAssigner;
