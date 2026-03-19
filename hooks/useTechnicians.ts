import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Profile, TechnicianSector } from '../types';

export const useTechnicians = () => {
  const [technicians, setTechnicians] = useState<Profile[]>([]);
  const [techSectors, setTechSectors] = useState<TechnicianSector[]>([]);

  useEffect(() => {
    supabase
      .from('profiles')
      .select('*')
      .in('role', ['TECNICO', 'ADMIN'])
      .then(({ data }) => {
        if (data) setTechnicians(data);
      });

    supabase
      .from('technician_sectors')
      .select('*')
      .then(({ data }) => {
        if (data) setTechSectors(data);
      });
  }, []);

  const availableTechnicians = useMemo(
    () => technicians.filter(t => t.is_available !== false),
    [technicians]
  );

  const getTechniciansForSector = (sectorId: string) => {
    const techIds = techSectors
      .filter(ts => ts.sector_id === sectorId)
      .map(ts => ts.technician_id);
    return technicians.filter(t => techIds.includes(t.id));
  };

  return { technicians, availableTechnicians, techSectors, getTechniciansForSector };
};
