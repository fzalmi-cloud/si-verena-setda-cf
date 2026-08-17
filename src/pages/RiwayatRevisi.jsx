import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { filterBiroByRole, getSingleBiroForRole, isRestrictedRole } from '@/lib/roleAccess';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { History, FileText, ExternalLink } from 'lucide-react';
import { SETDA_NAME } from '@/pages/UploadRenja';
import { format } from 'date-fns';

export default function RiwayatRevisi() {
  const { user } = useOutletContext() || {};
  const role = user?.role;
  const [selectedBiro, setSelectedBiro] = useState(getSingleBiroForRole(role) || '');

  const { data: allBiroList = [] } = useQuery({
    queryKey: ['biro-list'],
    queryFn: () => base44.entities.Biro.list(),
  });
  const biroList = filterBiroByRole(role, allBiroList);

  const { data: dokumen = [] } = useQuery({
    queryKey: ['dokumen-riwayat', selectedBiro],
    queryFn: () => selectedBiro
      ? base44.entities.DokumenRenja.filter({ nama_biro: selectedBiro }, '-created_date', 100)
      : [],
    enabled: !!selectedBiro,
  });

  const { data: revisi = [] } = useQuery({
    queryKey: ['revisi-list', selectedBiro],
    queryFn: () => selectedBiro
      ? base44.entities.RiwayatRevisi.filter({ nama_biro: selectedBiro }, '-created_date', 50)
      : [],
    enabled: !!selectedBiro,
  });

  const allItems = [
    ...dokumen.map(d => ({ ...d, type: 'dokumen' })),
    ...revisi.map(r => ({ ...r, type: 'revisi' })),
  ].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Riwayat Revisi</h1>
        <p className="text-sm text-muted-foreground mt-1">Tracking riwayat upload dan revisi dokumen Renja</p>
      </div>

      <div className="flex items-end gap-4 bg-card rounded-xl border border-border p-4">
        <div className="flex-1 max-w-xs">
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Biro / Unit</label>
          <Select value={selectedBiro} onValueChange={setSelectedBiro}>
            <SelectTrigger><SelectValue placeholder="Pilih biro/unit" /></SelectTrigger>
            <SelectContent>
              {biroList.map(b => (
                <SelectItem key={b.id} value={b.nama_biro}>{b.nama_biro}</SelectItem>
              ))}
              {!isRestrictedRole(role) && <SelectItem value={SETDA_NAME}>{SETDA_NAME}</SelectItem>}
            </SelectContent>
          </Select>
        </div>
      </div>

      {allItems.length > 0 ? (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs font-semibold">Tanggal</TableHead>
                <TableHead className="text-xs font-semibold">Jenis</TableHead>
                <TableHead className="text-xs font-semibold">Nama File</TableHead>
                <TableHead className="text-xs font-semibold">Versi</TableHead>
                <TableHead className="text-xs font-semibold">Catatan</TableHead>
                <TableHead className="text-xs font-semibold text-center">File</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="text-xs">
                    {item.created_date ? format(new Date(item.created_date), 'dd MMM yyyy HH:mm') : '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">
                      {item.type === 'revisi' ? 'Revisi' : item.jenis_dokumen?.replace(/_/g, ' ') || '-'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm font-medium">
                    {item.nama_file || item.jenis_dokumen || '-'}
                  </TableCell>
                  <TableCell className="text-sm">v{item.versi || 1}</TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                    {item.catatan_upload || item.catatan_revisi || '-'}
                  </TableCell>
                  <TableCell className="text-center">
                    {item.file_url && (
                      <a href={item.file_url} target="_blank" rel="noopener noreferrer"
                        className="text-primary hover:text-primary/80">
                        <ExternalLink className="w-4 h-4 inline" />
                      </a>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="text-center py-16 text-muted-foreground">
          <History className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">{selectedBiro ? 'Belum ada riwayat untuk unit ini' : 'Pilih biro/unit untuk melihat riwayat'}</p>
        </div>
      )}
    </div>
  );
}