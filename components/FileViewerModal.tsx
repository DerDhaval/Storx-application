'use client';

import React, { useEffect, useState } from 'react';
import Button from './Button';
import { StorXFile } from '@/lib/storx';
import { getS3Credentials } from '@/lib/s3-credentials';

interface FileViewerModalProps {
  isOpen: boolean;
  file: StorXFile | null;
  onClose: () => void;
}

interface FileContent {
  content: string | null;
  isGmail: boolean;
  htmlContent: string | null;
  emailSubject: string | null;
  emailFrom: string | null;
  emailDate: string | null;
  rawContent: string;
}

export default function FileViewerModal({
  isOpen,
  file,
  onClose,
}: FileViewerModalProps) {
  const [loading, setLoading] = useState(false);
  const [fileContent, setFileContent] = useState<FileContent | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && file) {
      fetchFileContent();
    } else {
      setFileContent(null);
      setError(null);
    }
  }, [isOpen, file]);

  const fetchFileContent = async () => {
    if (!file || !file.key || !file.bucket) return;

    try {
      setLoading(true);
      setError(null);

      const credentials = getS3Credentials();
      if (!credentials) {
        throw new Error('No S3 credentials available');
      }

      const response = await fetch('/api/storx/s3/view', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key: file.key,
          bucket: file.bucket,
          credentials,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to fetch file' }));
        throw new Error(errorData.error || 'Failed to fetch file');
      }

      const data = await response.json();
      setFileContent(data);
    } catch (err) {
      console.error('Error fetching file content:', err);
      setError(err instanceof Error ? err.message : 'Failed to load file');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !file) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold text-gray-900 truncate">
              {file.fileName}
            </h2>
            {fileContent?.isGmail && fileContent.emailSubject && (
              <p className="text-sm text-gray-600 mt-1 truncate">
                Subject: {fileContent.emailSubject}
              </p>
            )}
            {fileContent?.isGmail && fileContent.emailFrom && (
              <p className="text-xs text-gray-500 mt-1">
                From: {fileContent.emailFrom}
                {fileContent.emailDate && ` • ${fileContent.emailDate}`}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="ml-4 flex-shrink-0 w-10 h-10 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors"
            title="Close"
          >
            <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-storx-red/20 border-t-storx-red"></div>
              <p className="ml-4 text-gray-600">Loading file content...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="text-red-500 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-lg font-semibold text-gray-900 mb-2">Error loading file</p>
              <p className="text-gray-600">{error}</p>
            </div>
          ) : fileContent?.isGmail && fileContent.htmlContent ? (
            <div className="email-content">
              <iframe
                srcDoc={fileContent.htmlContent}
                className="w-full border border-gray-200 rounded-lg"
                style={{ minHeight: '500px', height: '100%' }}
                title="Email content"
              />
            </div>
          ) : fileContent?.content ? (
            <div className="bg-gray-50 rounded-lg p-4">
              <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono overflow-x-auto">
                {fileContent.content}
              </pre>
            </div>
          ) : fileContent?.rawContent ? (
            <div className="bg-gray-50 rounded-lg p-4">
              <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono overflow-x-auto">
                {fileContent.rawContent}
                {fileContent.rawContent.length >= 1000 && '...\n\n(Content truncated for preview)'}
              </pre>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">No content available to display</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

