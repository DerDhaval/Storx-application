'use client';

import React from 'react';
import { StorXFile } from '@/lib/storx';

interface FileCardProps {
  file: StorXFile;
  onDelete: (fileId: string) => void;
  onDownload: (file: StorXFile) => void;
  onOpen?: (file: StorXFile) => void;
  isDeleting?: boolean;
}

export default function FileCard({
  file,
  onDelete,
  onDownload,
  onOpen,
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

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't trigger if clicking on buttons
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    if (onOpen) {
      onOpen(file);
    }
  };

  return (
    <div 
      className={`group bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-storx-red/40 transition-all duration-200 overflow-hidden ${onOpen ? 'cursor-pointer' : ''}`}
      onClick={handleCardClick}
    >
      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* File Icon */}
          <div className="flex-shrink-0 w-14 h-14 rounded-lg bg-gradient-to-br from-storx-red/10 to-storx-red/5 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform duration-200">
            {getFileIcon(file.fileName)}
          </div>

          {/* File Info */}
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-gray-900 truncate mb-1 group-hover:text-storx-red transition-colors">
              {file.fileName}
            </h3>
            
            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 mb-2">
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                </svg>
                {file.size}
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {formatDate(file.uploadedAt)}
              </span>
              {file.bucket && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-storx-red/10 text-storx-red text-xs font-medium">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  {file.bucket}
                </span>
              )}
            </div>

            {file.mimeType && (
              <p className="text-xs text-gray-400 font-mono">{file.mimeType}</p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex-shrink-0 flex items-center gap-2 ml-4" onClick={(e) => e.stopPropagation()}>
            {/* Open/View Button */}
            {onOpen && (
              <button
                onClick={() => onOpen(file)}
                className="flex items-center justify-center w-10 h-10 rounded-lg bg-green-50 hover:bg-green-100 text-green-600 hover:text-green-700 transition-all duration-200 hover:scale-110 active:scale-95"
                title="Open file"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </button>
            )}
            {/* Download Button */}
            <button
              onClick={() => onDownload(file)}
              className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-700 transition-all duration-200 hover:scale-110 active:scale-95 group/btn"
              title="Download file"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </button>

            {/* Delete Button */}
            <button
              onClick={() => onDelete(file.id)}
              disabled={isDeleting}
              className="flex items-center justify-center w-10 h-10 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 transition-all duration-200 hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              title="Delete file"
            >
              {isDeleting ? (
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

