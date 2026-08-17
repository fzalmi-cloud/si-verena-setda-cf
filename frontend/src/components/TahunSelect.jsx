import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTahunOptions } from '@/hooks/useTahunOptions';

// Dropdown tahun renja dinamis — opsi dari tabel periode_renja (bukan hardcode)
export default function TahunSelect({ value, onValueChange, className = '', placeholder = 'Pilih tahun' }) {
  const { tahunOptions } = useTahunOptions();

  return (
    <Select value={String(value ?? '')} onValueChange={onValueChange}>
      <SelectTrigger className={className}><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>
        {tahunOptions.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
