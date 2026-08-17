import React from 'react';
import { cn } from '@/lib/utils';

export default function ScoreGauge({ score, size = 'lg', label }) {
  const radius = size === 'lg' ? 54 : 36;
  const stroke = size === 'lg' ? 8 : 6;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const viewBox = size === 'lg' ? 140 : 100;
  const center = viewBox / 2;

  const getColor = (s) => {
    if (s >= 90) return 'text-emerald-500';
    if (s >= 75) return 'text-blue-500';
    if (s >= 60) return 'text-amber-500';
    return 'text-red-500';
  };

  const getLabel = (s) => {
    if (s >= 90) return 'Sangat Siap';
    if (s >= 75) return 'Siap';
    if (s >= 60) return 'Perlu Perbaikan';
    return 'Belum Layak';
  };

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <svg width={viewBox} height={viewBox} className="transform -rotate-90">
          <circle cx={center} cy={center} r={radius} fill="none" stroke="currentColor"
            strokeWidth={stroke} className="text-muted/60" />
          <circle cx={center} cy={center} r={radius} fill="none" stroke="currentColor"
            strokeWidth={stroke} strokeDasharray={circumference} strokeDashoffset={circumference - progress}
            strokeLinecap="round" className={cn("transition-all duration-1000", getColor(score))} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn("font-display font-bold", size === 'lg' ? 'text-3xl' : 'text-xl')}>{score}</span>
          {size === 'lg' && <span className="text-[10px] text-muted-foreground font-medium mt-0.5">/ 100</span>}
        </div>
      </div>
      {label && <p className="text-xs text-muted-foreground mt-2 font-medium">{label}</p>}
      <p className={cn("text-xs font-semibold mt-0.5", getColor(score))}>{getLabel(score)}</p>
    </div>
  );
}