import React from 'react';
import { FlaskConical, Scan, Dna, ClipboardCheck, AlertTriangle } from 'lucide-react';
import { ModalityType } from '../../types';

interface ModalityIconProps {
  modality: ModalityType | 'Review' | string;
  size?: number;
  className?: string;
}

export const ModalityIcon: React.FC<ModalityIconProps> = ({
  modality,
  size = 18,
  className = ''
}) => {
  const norm = modality.toLowerCase();

  if (norm.includes('path')) {
    return (
      <div className={`p-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center justify-center ${className}`}>
        <FlaskConical size={size} />
      </div>
    );
  }

  if (norm.includes('imag') || norm.includes('echo') || norm.includes('mri') || norm.includes('ct')) {
    return (
      <div className={`p-1.5 rounded-lg bg-sky-50 text-sky-700 border border-sky-200 inline-flex items-center justify-center ${className}`}>
        <Scan size={size} />
      </div>
    );
  }

  if (norm.includes('mol') || norm.includes('dna') || norm.includes('gene') || norm.includes('ngs')) {
    return (
      <div className={`p-1.5 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 inline-flex items-center justify-center ${className}`}>
        <Dna size={size} />
      </div>
    );
  }

  if (norm.includes('rev')) {
    return (
      <div className={`p-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 inline-flex items-center justify-center ${className}`}>
        <ClipboardCheck size={size} />
      </div>
    );
  }

  return (
    <div className={`p-1.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 inline-flex items-center justify-center ${className}`}>
      <AlertTriangle size={size} />
    </div>
  );
};
