'use client';

import React, { useState } from 'react';
import Button from './Button';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  fileName: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting?: boolean;
  itemType?: 'file' | 'bucket';
}

export default function DeleteConfirmModal({
  isOpen,
  fileName,
  onConfirm,
  onCancel,
  isDeleting = false,
  itemType = 'file',
}: DeleteConfirmModalProps) {
  const [confirmText, setConfirmText] = useState('');

  if (!isOpen) return null;

  const requiresTyping = true; // Set to false if you want simpler confirmation
  const isConfirmEnabled = requiresTyping
    ? confirmText.toLowerCase() === 'delete'
    : true;

  const handleConfirm = () => {
    if (isConfirmEnabled) {
      onConfirm();
      setConfirmText(''); // Reset on confirm
    }
  };

  const handleCancel = () => {
    setConfirmText('');
    onCancel();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-shrink-0 w-12 h-12 bg-storx-red-lighter rounded-full flex items-center justify-center">
            <svg
              className="w-6 h-6 text-storx-red"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">
              Delete {itemType === 'bucket' ? 'Bucket' : 'File'}?
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              This action cannot be undone.
            </p>
          </div>
        </div>

        <div className="mb-6">
          <p className="text-gray-700 mb-2">
            Are you sure you want to delete {itemType === 'bucket' ? 'the bucket' : ''}:
          </p>
          <p className="font-semibold text-gray-900 bg-gray-50 p-3 rounded border border-gray-200 break-all">
            {fileName}
          </p>
          {itemType === 'bucket' && (
            <p className="text-sm text-red-600 mt-2">
              ⚠️ All files in this bucket will be permanently deleted.
            </p>
          )}
        </div>

        {requiresTyping && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type <span className="font-mono text-storx-red">delete</span> to
              confirm:
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type 'delete' here"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-storx-red focus:border-storx-red outline-none"
              disabled={isDeleting}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && isConfirmEnabled) {
                  handleConfirm();
                } else if (e.key === 'Escape') {
                  handleCancel();
                }
              }}
            />
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <Button
            variant="secondary"
            onClick={handleCancel}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleConfirm}
            isLoading={isDeleting}
            disabled={!isConfirmEnabled || isDeleting}
          >
            {isDeleting ? 'Deleting...' : `Delete ${itemType === 'bucket' ? 'Bucket' : 'File'}`}
          </Button>
        </div>
      </div>
    </div>
  );
}

