'use client';

import { cn } from '@/lib/utils';
import { useCallback, useEffect, useState } from 'react';
import { UploadCloud, X, AlertCircle, CheckCircle2 } from 'lucide-react';

type Props = {
  className?: string;
  onUploaded?: (hasFile: boolean) => void;
  onFileChange?: (file: File | null) => void;
};

export function UploadDropzone({ className, onUploaded, onFileChange }: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const [hasFile, setHasFile] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      setError(null);
      if (!files || files.length === 0) return;
      const file = files[0];
      if (!file.type.startsWith('image/')) {
        setError('Le fichier doit être une image (PNG, JPG).');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError('L\'image dépasse 10 Mo.');
        return;
      }
      setHasFile(true);
      setFile(file);
      onUploaded?.(true);
      onFileChange?.(file);
    },
    [onUploaded],
  );

  useEffect(() => {
    if (!file) { setPreviewUrl(null); return; }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <div className={className}>
      {!hasFile ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            handleFiles(e.dataTransfer.files);
          }}
          onClick={() => document.getElementById('upload-input')?.click()}
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors',
            isDragging ? 'border-primary bg-primary/5' : 'border-border bg-secondary/30 hover:border-primary/40 hover:bg-secondary/50',
          )}
        >
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <UploadCloud className="h-6 w-6" />
          </div>
          <p className="text-sm font-medium text-foreground">
            Glissez-déposez l'image de l'exercice ici
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            ou cliquez pour parcourir — PNG, JPG (max 10 Mo)
          </p>
          <input
            id="upload-input"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border bg-success/5 px-4 py-2.5">
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-success">
              <CheckCircle2 className="h-4 w-4" />
              Image téléversée
            </span>
            <button
              onClick={() => {
                setHasFile(false);
                setFile(null);
                onUploaded?.(false);
                onFileChange?.(null);
              }}
              className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-destructive"
            >
              <X className="h-3.5 w-3.5" />
              Retirer
            </button>
          </div>
          <div className="p-4">
            {previewUrl && <img src={previewUrl} alt="Aperçu de l'exercice téléversé" className="mx-auto max-h-80 w-full max-w-xs rounded-md object-contain" />}
            <p className="mt-2 text-center text-xs text-muted-foreground">{file?.name} · {file ? `${(file.size / (1024 * 1024)).toFixed(1)} Mo` : ''}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}
