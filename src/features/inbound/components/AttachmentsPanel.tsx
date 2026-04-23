import { useCallback, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { attachmentFileSchema } from '../schemas/inboundDetailSchemas';
import type { InboundAttachment } from '../types/inboundDetailType';

interface AttachmentsPanelProps {
  attachments: InboundAttachment[];
  onUpload: (file: File) => void;
  onDelete: (attachmentId: string) => void;
  isUploading: boolean;
  uploadProgress: number;
}

const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

export function AttachmentsPanel({
  attachments,
  onUpload,
  onDelete,
  isUploading,
  uploadProgress,
}: AttachmentsPanelProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const validateAndUpload = useCallback(
    (file: File) => {
      const result = attachmentFileSchema.safeParse({
        name: file.name,
        size: file.size,
        type: file.type,
      });

      if (!result.success) {
        const firstError = result.error.issues[0]?.message;
        toast({
          title: 'Invalid file',
          description: firstError ?? 'File does not meet requirements',
          variant: 'destructive',
        });
        return;
      }

      onUpload(file);
    },
    [onUpload, toast],
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        validateAndUpload(file);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    },
    [validateAndUpload],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) {
        validateAndUpload(file);
      }
    },
    [validateAndUpload],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500">
        Attachments
      </h3>

      {/* Drop Zone */}
      <div
        className={cn(
          'border-2 border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center text-center transition-colors',
          isDragOver && 'border-blue-400 bg-blue-50/50',
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <span className="material-symbols-outlined text-3xl text-slate-300 mb-3">
          receipt_long
        </span>
        <p className="text-sm font-bold text-slate-700">
          Upload Shipment Receipt
        </p>
        <p className="text-xs text-slate-500 mt-1">
          PDF, JPG, or PNG up to 10MB
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(',')}
          onChange={handleFileSelect}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="mt-3 px-4 py-2 rounded-lg bg-slate-100 text-xs font-bold hover:bg-slate-200 transition-colors disabled:opacity-50"
        >
          {isUploading ? 'Uploading...' : 'Select Files'}
        </button>

        {/* Upload Progress */}
        {isUploading && (
          <div className="mt-3 w-full max-w-[200px]">
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              {uploadProgress}% uploaded
            </p>
          </div>
        )}
      </div>

      {/* Attachment List */}
      {attachments.length > 0 && (
        <div className="space-y-2">
          {attachments.map((att) => (
            <div
              key={att.id}
              className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm border border-slate-100"
            >
              <div className="flex items-center gap-3">
                <FileIcon type={att.fileType} />
                <div>
                  <p className="text-xs font-bold text-slate-900">
                    {att.fileName}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {formatFileSize(att.fileSize)} •{' '}
                    {formatDate(att.uploadedAt)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => onDelete(att.id)}
                className="text-slate-400 hover:text-rose-500 transition-colors"
              >
                <span className="material-symbols-outlined text-lg">
                  delete
                </span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FileIcon({ type }: { type: string }) {
  const color =
    type === 'pdf'
      ? 'text-red-500'
      : type === 'jpg' || type === 'jpeg'
        ? 'text-blue-500'
        : 'text-emerald-500';

  const icon =
    type === 'pdf'
      ? 'picture_as_pdf'
      : type === 'jpg' || type === 'jpeg'
        ? 'image'
        : 'image';

  return (
    <span className={cn('material-symbols-outlined text-xl', color)}>
      {icon}
    </span>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
