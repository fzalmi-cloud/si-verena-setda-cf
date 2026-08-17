import React, { useCallback, useState } from 'react';
import { Upload, File, X, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';

export default function FileUploader({ onFileUploaded, acceptedTypes = '.xlsx,.xls,.doc,.docx,.pdf', label }) {
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  const handleUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setUploadedFile({ name: file.name, url: file_url });
    setUploading(false);
    onFileUploaded({ name: file.name, url: file_url });
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  }, []);

  const handleDragOver = (e) => { e.preventDefault(); setDragActive(true); };
  const handleDragLeave = () => setDragActive(false);

  const handleInputChange = (e) => {
    const file = e.target.files[0];
    if (file) handleUpload(file);
  };

  const clearFile = () => {
    setUploadedFile(null);
    onFileUploaded(null);
  };

  if (uploadedFile) {
    return (
      <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
        <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{uploadedFile.name}</p>
          <p className="text-xs text-emerald-600">Berhasil diunggah</p>
        </div>
        <button onClick={clearFile} className="text-muted-foreground hover:text-destructive">
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={cn(
        "border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer",
        dragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
        uploading && "opacity-50 pointer-events-none"
      )}
    >
      <input
        type="file"
        accept={acceptedTypes}
        onChange={handleInputChange}
        className="hidden"
        id={`file-${label}`}
        disabled={uploading}
      />
      <label htmlFor={`file-${label}`} className="cursor-pointer">
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Mengunggah...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Upload className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">{label || 'Pilih atau seret file'}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Excel, Word, atau PDF</p>
            </div>
          </div>
        )}
      </label>
    </div>
  );
}