'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import FileCard from '@/components/FileCard';
import Button from '@/components/Button';
import DeleteConfirmModal from '@/components/DeleteConfirmModal';
import UndoToast from '@/components/UndoToast';
import { StorXFile } from '@/lib/storx';
import { S3Credentials, saveS3Credentials, getS3Credentials, clearS3Credentials } from '@/lib/s3-credentials';
import { listFilesS3 } from '@/lib/storx';

interface AccountInfo {
  email: string;
  storageUsed: string;
  storageLimit: string;
  filesCount: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [files, setFiles] = useState<StorXFile[]>([]);
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<{ id: string; fileName: string } | null>(null);
  const [deletedFile, setDeletedFile] = useState<{ id: string; fileName: string; file: StorXFile } | null>(null);
  const [undoTimeout, setUndoTimeout] = useState<NodeJS.Timeout | null>(null);

  // Check for S3 credentials in URL (from OAuth callback)
  useEffect(() => {
    const s3CredsParam = searchParams.get('s3_creds');
    if (s3CredsParam) {
      try {
        const credentials: S3Credentials = JSON.parse(decodeURIComponent(s3CredsParam));
        saveS3Credentials(credentials);
        // Remove from URL
        router.replace('/dashboard');
      } catch (err) {
        console.error('Error parsing S3 credentials:', err);
        setError('Failed to save credentials');
      }
    }
  }, [searchParams, router]);

  useEffect(() => {
    fetchData();
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (undoTimeout) {
        clearTimeout(undoTimeout);
      }
    };
  }, [undoTimeout]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get S3 credentials from localStorage
      const credentials = getS3Credentials();
      
      if (!credentials) {
        // No credentials, redirect to login
        router.push('/?error=no_credentials');
        return;
      }

      // Use S3 credentials to list files
      const filesList = await listFilesS3(credentials);
      setFiles(filesList);

      // For account info, we can calculate from files or call API if available
      // For now, we'll calculate from files
      const totalSize = filesList.reduce((sum, file) => {
        const sizeMB = parseFloat(file.size.replace(' MB', ''));
        return sum + sizeMB;
      }, 0);

      setAccountInfo({
        email: 'user@storx.io', // Would come from API if available
        storageUsed: `${totalSize.toFixed(2)} MB`,
        storageLimit: '100 GB', // Would come from API
        filesCount: filesList.length,
      });
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
      
      // If credentials expired, clear them
      if (err instanceof Error && err.message.includes('expired')) {
        clearS3Credentials();
        router.push('/?error=credentials_expired');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      // Clear S3 credentials from localStorage
      clearS3Credentials();
      router.push('/');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      setError(null);

      const credentials = getS3Credentials();
      if (!credentials) {
        throw new Error('No S3 credentials available');
      }

      // TODO: Implement S3-based upload
      // Use /api/storx/s3/upload endpoint with S3 credentials
      const formData = new FormData();
      formData.append('file', file);
      formData.append('credentials', JSON.stringify(credentials));

      const response = await fetch('/api/storx/s3/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload file');
      }

      // Refresh file list
      await fetchData();
      e.target.value = ''; // Reset file input
    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteClick = (fileId: string, fileName: string) => {
    setFileToDelete({ id: fileId, fileName });
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!fileToDelete) return;

    const file = files.find((f) => f.id === fileToDelete.id);
    if (!file) return;

    try {
      setDeletingFileId(fileToDelete.id);
      setError(null);
      setDeleteModalOpen(false);

      const credentials = getS3Credentials();
      if (!credentials) {
        throw new Error('No S3 credentials available');
      }

      // TODO: Implement S3-based delete
      // Use /api/storx/s3/delete endpoint with S3 credentials
      const response = await fetch('/api/storx/s3/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key: fileToDelete.id, // S3 object key
          credentials,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete file');
      }

      // Store deleted file for undo
      setDeletedFile({ id: fileToDelete.id, fileName: fileToDelete.fileName, file });
      
      // Remove file from list
      setFiles(files.filter((f) => f.id !== fileToDelete.id));

      // Auto-dismiss undo toast after 10 seconds
      const timeout = setTimeout(() => {
        setDeletedFile(null);
      }, 10000);
      setUndoTimeout(timeout);
    } catch (err) {
      console.error('Delete error:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete file');
    } finally {
      setDeletingFileId(null);
      setFileToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteModalOpen(false);
    setFileToDelete(null);
  };

  const handleUndo = async () => {
    if (!deletedFile) return;

    try {
      // Clear timeout
      if (undoTimeout) {
        clearTimeout(undoTimeout);
        setUndoTimeout(null);
      }

      // Note: This assumes StorX has a restore API endpoint
      // If not available, you would need to re-upload the file
      // For now, we'll just restore it in the UI
      setFiles([...files, deletedFile.file]);
      setDeletedFile(null);
      
      // Optionally try to restore via API if available
      // const response = await fetch(`/api/storx/files/${deletedFile.id}/restore`, {
      //   method: 'POST',
      // });
    } catch (err) {
      console.error('Undo error:', err);
      setError('Failed to restore file. Please refresh and check if it still exists.');
    }
  };

  const handleUndoDismiss = () => {
    if (undoTimeout) {
      clearTimeout(undoTimeout);
      setUndoTimeout(null);
    }
    setDeletedFile(null);
  };

  const handleDownload = async (fileId: string) => {
    try {
      const credentials = getS3Credentials();
      if (!credentials) {
        throw new Error('No S3 credentials available');
      }

      // TODO: Implement S3-based download
      // Use /api/storx/s3/download endpoint with S3 credentials
      const response = await fetch('/api/storx/s3/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key: fileId, // S3 object key
          credentials,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get download URL');
      }

      const data = await response.json();
      if (data.url) {
        window.open(data.url, '_blank');
      }
    } catch (err) {
      console.error('Download error:', err);
      setError(err instanceof Error ? err.message : 'Failed to download file');
    }
  };

  const formatStorage = (used: string, limit: string) => {
    const usedNum = parseFloat(used);
    const limitNum = parseFloat(limit);
    const percentage = (usedNum / limitNum) * 100;
    return { usedNum, limitNum, percentage: Math.round(percentage) };
  };

  return (
    <div className="min-h-screen">
      <Navbar onLogout={handleLogout} isAuthenticated={true} />
      
      {/* Delete Confirmation Modal */}
      {fileToDelete && (
        <DeleteConfirmModal
          isOpen={deleteModalOpen}
          fileName={fileToDelete.fileName}
          onConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
          isDeleting={deletingFileId === fileToDelete.id}
        />
      )}

      {/* Undo Toast */}
      {deletedFile && (
        <UndoToast
          fileName={deletedFile.fileName}
          onUndo={handleUndo}
          onDismiss={handleUndoDismiss}
          isVisible={!!deletedFile}
        />
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Account Info Section */}
        {accountInfo && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Account Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-gray-500 mb-1">Email</p>
                <p className="text-lg font-semibold text-gray-900">
                  {accountInfo.email}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Files</p>
                <p className="text-lg font-semibold text-gray-900">
                  {accountInfo.filesCount} files
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Storage Usage</p>
                <div className="mt-2">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-semibold text-gray-900">
                      {accountInfo.storageUsed} / {accountInfo.storageLimit}
                    </span>
                    <span className="text-gray-600">
                      {formatStorage(
                        accountInfo.storageUsed,
                        accountInfo.storageLimit
                      ).percentage}
                      %
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{
                        width: `${formatStorage(
                          accountInfo.storageUsed,
                          accountInfo.storageLimit
                        ).percentage}%`,
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* File Upload Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Upload File
          </h2>
          <div className="flex items-center gap-4">
            <label className="cursor-pointer">
              <input
                type="file"
                className="hidden"
                onChange={handleFileUpload}
                disabled={uploading}
              />
              <span className="inline-block">
                <Button
                  variant="primary"
                  isLoading={uploading}
                  disabled={uploading}
                  onClick={(e) => e.preventDefault()}
                >
                  {uploading ? 'Uploading...' : 'Choose File'}
                </Button>
              </span>
            </label>
            <p className="text-sm text-gray-500">
              Select a file to upload to your StorX account
            </p>
          </div>
        </div>

        {/* Files List Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Your Files</h2>
            <Button variant="secondary" onClick={fetchData} disabled={loading}>
              Refresh
            </Button>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600">Loading files...</p>
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No files found</p>
              <p className="text-gray-400 mt-2">
                Upload your first file to get started!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {files.map((file) => (
                <FileCard
                  key={file.id}
                  file={file}
                  onDelete={() => handleDeleteClick(file.id, file.fileName)}
                  onDownload={handleDownload}
                  isDeleting={deletingFileId === file.id}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

