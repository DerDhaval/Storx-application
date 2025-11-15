'use client';

import React from 'react';
import { StorXFile } from '@/lib/storx';
import Button from './Button';

interface FileCardProps {
  file: StorXFile;
  onDelete: (fileId: string) => void;
  onDownload: (fileId: string) => void;
  isDeleting?: boolean;
}

export default function FileCard({
  file,
  onDelete,
  onDownload,
  isDeleting = false,
}: FileCardProps) {
  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const iconMap: Record<string, string> = {
      pdf: '📄',
      doc: '📝',
      docx: '📝',
      xls: '📊',
      xlsx: '📊',
      png: '🖼️',
      jpg: '🖼️',
      jpeg: '🖼️',
      gif: '🖼️',
      mp4: '🎥',
      mp3: '🎵',
      zip: '📦',
      txt: '📄',
    };
    return iconMap[ext || ''] || '📄';
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown date';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return 'Unknown date';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border border-gray-200">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4 flex-1">
          <div className="text-4xl">{getFileIcon(file.fileName)}</div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {file.fileName}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {file.size} • {formatDate(file.uploadedAt)}
            </p>
            {file.mimeType && (
              <p className="text-xs text-gray-400 mt-1">{file.mimeType}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2 ml-4">
          <Button
            variant="secondary"
            onClick={() => onDownload(file.id)}
            className="px-4 py-2 text-sm"
          >
            Download
          </Button>
          <Button
            variant="danger"
            onClick={() => onDelete(file.id)}
            isLoading={isDeleting}
            className="px-4 py-2 text-sm"
          >
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}

