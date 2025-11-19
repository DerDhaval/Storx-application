'use client';

import React from 'react';
import Button from './Button';

interface UndoToastProps {
  fileName: string;
  onUndo: () => void;
  onDismiss: () => void;
  isVisible: boolean;
}

export default function UndoToast({
  fileName,
  onUndo,
  onDismiss,
  isVisible,
}: UndoToastProps) {
  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-slide-up">
      <div className="bg-white rounded-lg shadow-xl border-2 border-storx-red/20 p-4 max-w-sm">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <svg
              className="w-5 h-5 text-storx-red"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900">
              File deleted
            </p>
            <p className="text-xs text-gray-500 truncate mt-1">{fileName}</p>
          </div>
          <div className="flex gap-2 ml-2">
            <Button
              variant="secondary"
              onClick={onUndo}
              className="px-3 py-1 text-xs"
            >
              Undo
            </Button>
            <button
              onClick={onDismiss}
              className="text-gray-400 hover:text-gray-600 px-2"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

