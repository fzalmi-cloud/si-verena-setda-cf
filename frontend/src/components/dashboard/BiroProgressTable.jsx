import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Eye } from 'lucide-react';
import { Link } from 'react-router-dom';

const statusConfig = {
  draft: { label: 'Draft', class: 'bg-muted text-muted-foreground' },
  sedang_diperiksa: { label: 'Sedang Diperiksa', class: 'bg-blue-50 text-blue-700 border-blue-200' },
  perlu_revisi: { label: 'Perlu Revisi', class: 'bg-amber-50 text-amber-700 border-amber-200' },
  layak_kirim: { label: 'Layak Kirim', class: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  sudah_dikirim: { label: 'Sudah Dikirim', class: 'bg-primary/10 text-primary border-primary/20' },
};

export default function BiroProgressTable({ skorData = [] }) {
  const safeSkorData = Array.isArray(skorData) ? skorData : [];
  
  if (!safeSkorData.length) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        Belum ada data pemeriksaan
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30">
            <TableHead className="font-semibold text-xs">Biro</TableHead>
            <TableHead className="font-semibold text-xs text-center">Skor</TableHead>
            <TableHead className="font-semibold text-xs">Progress</TableHead>
            <TableHead className="font-semibold text-xs text-center">Status</TableHead>
            <TableHead className="font-semibold text-xs text-center">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {safeSkorData.map((item) => {
            const status = statusConfig[item.status_final] || statusConfig.draft;
            const scoreColor = item.skor_total >= 90 ? 'text-emerald-600' : item.skor_total >= 75 ? 'text-blue-600' : item.skor_total >= 60 ? 'text-amber-600' : 'text-red-600';
            return (
              <TableRow key={item.id} className="hover:bg-muted/20">
                <TableCell className="font-medium text-sm">{item.nama_biro}</TableCell>
                <TableCell className="text-center">
                  <span className={cn("font-display font-bold text-lg", scoreColor)}>
                    {item.skor_total || 0}
                  </span>
                </TableCell>
                <TableCell>
                  <Progress value={item.skor_total || 0} className="h-2" />
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline" className={cn("text-[10px] font-medium", status.class)}>
                    {status.label}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <Link to={`/hasil?biro=${encodeURIComponent(item.nama_biro)}`}
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                    <Eye className="w-3.5 h-3.5" /> Detail
                  </Link>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}