import React, { useRef, useState } from 'react';
import { Image as ImageIcon, Loader2, RefreshCw, Trash2, UploadCloud } from 'lucide-react';
import { getOptimizedCloudinaryUrl, uploadImageAsset } from '../../lib/cloudinary';

interface ImageUploaderProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  folder?: string;
  hint?: string;
  aspectClass?: string;
  allowUrlInput?: boolean;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  label,
  value,
  onChange,
  folder = 'o-learning/courses',
  hint = 'PNG, JPG, WebP or SVG up to 5 MB',
  aspectClass = 'aspect-video',
  allowUrlInput = true,
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFile = async (file?: File) => {
    if (!file) return;
    setError('');
    setUploading(true);
    try {
      const result = await uploadImageAsset(file, folder);
      onChange(result.url);
    } catch (err) {
      setError((err as Error).message || 'Image upload failed.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const previewUrl = value ? getOptimizedCloudinaryUrl(value, 640) : '';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-300">{label}</label>
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-400 hover:text-rose-300"
          >
            <Trash2 className="h-3 w-3" /> Clear
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      {previewUrl ? (
        <div className="group relative overflow-hidden rounded-xl border border-slate-700 bg-slate-900/90">
          <div className={`${aspectClass} w-full overflow-hidden bg-slate-950`}>
            <img src={previewUrl} alt={label} className="h-full w-full object-cover" />
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-slate-800 bg-slate-900/95 px-3 py-2">
            <span className="truncate text-[11px] text-slate-400">{value}</span>
            <button
              type="button"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[#FF7A00] px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-orange-500 disabled:opacity-60"
            >
              {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              {uploading ? 'Uploading...' : 'Replace'}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
          }}
          onDrop={(e) => {
            e.preventDefault();
            handleFile(e.dataTransfer.files?.[0]);
          }}
          className="flex w-full flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-900/60 px-4 py-6 text-center transition hover:border-[#FF7A00]/70 hover:bg-slate-900 disabled:opacity-60"
        >
          {uploading ? (
            <Loader2 className="mb-2 h-7 w-7 animate-spin text-[#FF7A00]" />
          ) : (
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-[#FF7A00]">
              <UploadCloud className="h-5 w-5" />
            </div>
          )}
          <span className="text-xs font-semibold text-slate-200">
            {uploading ? 'Uploading media...' : 'Click to upload or drag & drop'}
          </span>
          <span className="mt-0.5 text-[11px] text-slate-400">{hint}</span>
        </button>
      )}

      {allowUrlInput && (
        <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/70 px-2.5 py-1.5">
          <ImageIcon className="h-3.5 w-3.5 shrink-0 text-slate-500" />
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Or paste existing /courses/... or https://... URL"
            className="w-full bg-transparent text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none"
          />
        </div>
      )}

      {error && <p className="text-xs font-medium text-rose-400">{error}</p>}
    </div>
  );
};

