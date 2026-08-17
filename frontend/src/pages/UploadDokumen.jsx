import React, { useState } from 'react';
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import FileUploader from '@/components/upload/FileUploader';
import { Upload, FileText, FileSpreadsheet, FolderOpen, Info, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

const jenisUtama = [
  { value: 'narasi_renja', label: 'Dokumen Narasi Renja', icon: FileText, subJenis: ['dokumen_narasi_word_pdf'] },
  { value: 'matriks_renja', label: 'Matriks Renja (Excel)', icon: FileSpreadsheet, subJenis: ['matriks_excel'] },
  { value: 'dokumen_pendukung', label: 'Dokumen Pendukung', icon: FolderOpen, subJenis: [
    'sk_tim_penyusun', 'bukti_orientasi', 'undangan_forum', 'berita_acara_forum',
    'notulen_rapat', 'dokumentasi_kegiatan', 'hasil_input_sipd',
    'tabel_tc29', 'tabel_tc30', 'tabel_tc31', 'tabel_tc32', 'tabel_tc33', 'lainnya'
  ]},
  { value: 'checklist_verifikasi', label: 'Checklist Verifikasi Bappeda', icon: CheckCircle2, subJenis: ['checklist_bappeda'] },
];

const subJenisLabels = {
  dokumen_narasi_word_pdf: 'Dokumen Narasi (Word/PDF)',
  matriks_excel: 'Matriks Program/Kegiatan/Subkegiatan',
  sk_tim_penyusun: 'SK Tim Penyusun Renja',
  bukti_orientasi: 'Bukti Pelaksanaan Orientasi',
  undangan_forum: 'Undangan Forum Perangkat Daerah',
  berita_acara_forum: 'Berita Acara Forum Perangkat Daerah',
  notulen_rapat: 'Notulen Rapat',
  dokumentasi_kegiatan: 'Dokumentasi Kegiatan',
  hasil_input_sipd: 'Hasil Input SIPD',
  tabel_tc29: 'Tabel T-C.29', tabel_tc30: 'Tabel T-C.30',
  tabel_tc31: 'Tabel T-C.31', tabel_tc32: 'Tabel T-C.32', tabel_tc33: 'Tabel T-C.33',
  checklist_bappeda: 'Checklist Bappeda',
  lainnya: 'Lainnya',
};

export default function UploadDokumen() {
  const queryClient = useQueryClient();
  const [selectedBiro, setSelectedBiro] = useState('');
  const [tahun, setTahun] = useState('2027');
  const [jenisDoc, setJenisDoc] = useState('');
  const [subJenis, setSubJenis] = useState('');
  const [catatan, setCatatan] = useState('');
  const [fileData, setFileData] = useState(null);

  const { data: biroList = [] } = useQuery({
    queryKey: ['biro-list'],
    queryFn: () => api.list("biro"),
  });

  const createMutation = useMutation({
    mutationFn: (data) => api.create("dokumenrenja", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dokumen-renja'] });
      toast.success('Dokumen berhasil diunggah');
      setFileData(null);
      setJenisDoc('');
      setSubJenis('');
      setCatatan('');
    },
  });

  const currentJenis = jenisUtama.find(j => j.value === jenisDoc);

  const handleSubmit = () => {
    if (!selectedBiro || !jenisDoc || !fileData) {
      toast.error('Lengkapi semua field yang wajib');
      return;
    }
    createMutation.mutate({
      nama_biro: selectedBiro,
      periode_tahun: parseInt(tahun),
      jenis_dokumen: jenisDoc,
      sub_jenis: subJenis || undefined,
      nama_file: fileData.name,
      file_url: fileData.url,
      catatan_upload: catatan || undefined,
      status_upload: 'diunggah',
    });
  };

  // Existing uploads
  const { data: existingDocs = [] } = useQuery({
    queryKey: ['dokumen-renja', selectedBiro],
    queryFn: () => selectedBiro
      ? api.list("dokumenrenja", { limit: 50 })
      : [],
    enabled: !!selectedBiro,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Upload Dokumen Renja</h1>
        <p className="text-sm text-muted-foreground mt-1">Unggah dokumen narasi, matriks, dan pendukung Renja</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload form */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Upload className="w-4 h-4 text-primary" />
                Form Upload
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Biro *</label>
                  <Select value={selectedBiro} onValueChange={setSelectedBiro}>
                    <SelectTrigger><SelectValue placeholder="Pilih biro" /></SelectTrigger>
                    <SelectContent>
                      {biroList.map(b => (
                        <SelectItem key={b.id} value={b.nama_biro}>{b.nama_biro}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Tahun Renja *</label>
                  <Select value={tahun} onValueChange={setTahun}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2025">2025</SelectItem>
                      <SelectItem value="2026">2026</SelectItem>
                      <SelectItem value="2027">2027</SelectItem>
                      <SelectItem value="2028">2028</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Jenis Dokumen *</label>
                <Select value={jenisDoc} onValueChange={(v) => { setJenisDoc(v); setSubJenis(''); }}>
                  <SelectTrigger><SelectValue placeholder="Pilih jenis dokumen" /></SelectTrigger>
                  <SelectContent>
                    {jenisUtama.map(j => (
                      <SelectItem key={j.value} value={j.value}>{j.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {currentJenis && currentJenis.subJenis.length > 1 && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Sub Jenis</label>
                  <Select value={subJenis} onValueChange={setSubJenis}>
                    <SelectTrigger><SelectValue placeholder="Pilih sub jenis" /></SelectTrigger>
                    <SelectContent>
                      {currentJenis.subJenis.map(s => (
                        <SelectItem key={s} value={s}>{subJenisLabels[s]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">File Dokumen *</label>
                <FileUploader
                  label="Pilih atau seret file dokumen"
                  onFileUploaded={setFileData}
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Catatan (opsional)</label>
                <Textarea
                  value={catatan}
                  onChange={e => setCatatan(e.target.value)}
                  placeholder="Tambahkan catatan untuk dokumen ini..."
                  rows={3}
                />
              </div>

              <Button onClick={handleSubmit} disabled={createMutation.isPending} className="w-full">
                {createMutation.isPending ? 'Mengunggah...' : 'Upload Dokumen'}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Existing docs sidebar */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-primary" />
                Dokumen Terunggah
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedBiro ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                  <Info className="w-4 h-4" />
                  <span>Pilih biro terlebih dahulu</span>
                </div>
              ) : existingDocs.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">Belum ada dokumen</p>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {existingDocs.map(doc => (
                    <div key={doc.id} className="flex items-start gap-2 p-2 rounded-lg bg-muted/30 hover:bg-muted/50">
                      <FileText className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{doc.nama_file || doc.jenis_dokumen}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                            {doc.jenis_dokumen?.replace(/_/g, ' ')}
                          </Badge>
                          <span className="text-[9px] text-muted-foreground">v{doc.versi || 1}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}