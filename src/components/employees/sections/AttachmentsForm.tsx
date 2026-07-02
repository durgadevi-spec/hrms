import React, { useCallback } from 'react';
import { UploadCloud, File, Trash2, FileText, Image as ImageIcon } from 'lucide-react';

interface Attachment {
  id?: string;
  file?: File;
  name: string;
  size: number;
  type: string;
  url?: string;
  category: string;
}

interface Props {
  data: Attachment[];
  errors: any;
  onChange: (data: Attachment[]) => void;
}

export default function AttachmentsForm({ data, onChange }: Props) {
  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  }, [data]);

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const readFileAsDataUrl = (f: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(f);
    });

  const handleFiles = async (files: File[]) => {
    const newAttachments = await Promise.all(
      files.map(async f => ({
        name: f.name,
        size: f.size,
        type: f.type,
        url: await readFileAsDataUrl(f), // persistent base64 data, not a temporary blob: link
        category: 'General',
      }))
    );
    onChange([...data, ...newAttachments]);
  };

  const handleRemove = (index: number) => {
    onChange(data.filter((_, i) => i !== index));
  };

  const handleCategoryChange = (index: number, category: string) => {
    const newData = [...data];
    newData[index] = { ...newData[index], category };
    onChange(newData);
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <ImageIcon className="w-8 h-8 text-blue-500" />;
    if (type === 'application/pdf') return <FileText className="w-8 h-8 text-red-500" />;
    return <File className="w-8 h-8 text-secondary-500" />;
  };

  return (
    <div className="space-y-6">

      {/* Drag & Drop Zone */}
      <div
        onDragOver={onDragOver}
        onDrop={onDrop}
        className="relative w-full flex flex-col items-center justify-center py-10 px-4 border-2 border-dashed border-primary-300 dark:border-primary-800 bg-primary-50/50 dark:bg-primary-900/10 rounded-2xl hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors cursor-pointer group"
      >
        <div className="w-14 h-14 bg-white dark:bg-surface-800 rounded-full flex items-center justify-center shadow-sm mb-4 group-hover:scale-110 transition-transform">
          <UploadCloud className="w-6 h-6 text-primary-600" />
        </div>
        <p className="text-sm font-semibold text-secondary-900 dark:text-white">Click or drag files here to upload</p>
        <p className="text-xs text-secondary-500 mt-1">Supports PDF, JPG, PNG, DOCX up to 10MB</p>

        <input
          type="file"
          multiple
          onChange={onFileInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>

      {/* File List */}
      {data.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-bold text-secondary-900 dark:text-white">Uploaded Documents ({data.length})</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.map((file, index) => (
              <div key={index} className="flex items-start gap-4 p-4 bg-surface-50 dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700">

                {(file.type || '').startsWith('image/') && file.url ? (
                  <div className="w-12 h-12 rounded-lg bg-surface-200 flex-shrink-0 overflow-hidden">
                    <img src={file.url} alt="preview" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-white dark:bg-surface-900 flex items-center justify-center flex-shrink-0 border border-surface-200 dark:border-surface-700">
                    {getFileIcon(file.type || '')}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-secondary-900 dark:text-white truncate" title={file.name}>{file.name || 'Document'}</p>
                  <p className="text-xs text-secondary-500 mt-0.5">{formatSize(file.size || 0)}</p>

                  <div className="mt-2">
                    <select
                      value={file.category}
                      onChange={(e) => handleCategoryChange(index, e.target.value)}
                      className="text-xs px-2 py-1 rounded-md border border-surface-300 bg-white text-secondary-700 w-full focus:ring-1 focus:ring-primary-500"
                    >
                      <option value="General">General</option>
                      <option value="Resume / CV">Resume / CV</option>
                      <option value="Passport">Passport</option>
                      <option value="ID Proof">ID Proof</option>
                      <option value="Address Proof">Address Proof</option>
                      <option value="Educational Certificate">Educational Certificate</option>
                      <option value="Experience Letter">Experience Letter</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={() => handleRemove(index)}
                  className="p-2 text-secondary-400 hover:text-error-500 hover:bg-error-50 dark:hover:bg-error-500/20 rounded-lg transition-colors flex-shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}