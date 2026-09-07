import React from 'react';
import { FreshnessState } from '../../types';

interface FreshnessDotProps {
  freshness: FreshnessState | string;
  showLabel?: boolean;
  className?: string;
}

export const FreshnessDot: React.FC<FreshnessDotProps> = ({
  freshness,
  showLabel = false,
  className = ''
}) => {
  let color = 'bg-slate-400 text-slate-700 border-slate-300';
  let label = freshness;

  switch (freshness) {
    case 'Current':
      color = 'bg-emerald-500 text-emerald-800 border-emerald-300';
      break;
    case 'Stale':
      color = 'bg-amber-400 text-amber-800 border-amber-300';
      break;
    case 'Very Stale':
      color = 'bg-rose-500 text-rose-800 border-rose-300';
      break;
    case 'Missing':
      color = 'bg-rose-600 text-rose-800 border-rose-300';
      break;
    case 'Pending':
      color = 'bg-blue-500 text-blue-800 border-blue-300';
      break;
    default:
      color = 'bg-slate-400 text-slate-700 border-slate-300';
  }

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span className={`h-2.5 w-2.5 rounded-full ring-2 ring-white ${color.split(' ')[0]}`} />
      {showLabel && (
        <span className="text-xs font-medium text-slate-700">{label}</span>
      )}
    </span>
  );
};
