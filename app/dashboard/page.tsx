'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import FileCard from '@/components/FileCard';
import FileList from '@/components/FileList';
import Button from '@/components/Button';
import DeleteConfirmModal from '@/components/DeleteConfirmModal';
import FileViewerModal from '@/components/FileViewerModal';
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
  const [buckets, setBuckets] = useState<string[]>([]);
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<{ id: string; fileName: string } | null>(null);
  const [deletedFile, setDeletedFile] = useState<{ id: string; fileName: string; file: StorXFile } | null>(null);
  const [undoTimeout, setUndoTimeout] = useState<NodeJS.Timeout | null>(null);
  const [viewerModalOpen, setViewerModalOpen] = useState(false);
  const [fileToView, setFileToView] = useState<StorXFile | null>(null);
  const [showCreateBucket, setShowCreateBucket] = useState(false);
  const [bucketName, setBucketName] = useState('');
  const [creatingBucket, setCreatingBucket] = useState(false);
  const [deletingBucket, setDeletingBucket] = useState<string | null>(null);
  const [bucketToDelete, setBucketToDelete] = useState<string | null>(null);
  const [expandedBuckets, setExpandedBuckets] = useState<Set<string>>(new Set());
  const fileInputRefs = React.useRef<Record<string, HTMLInputElement | null>>({});
  const [bucketPaths, setBucketPaths] = useState<Record<string, string>>({});
  const [uploadingBuckets, setUploadingBuckets] = useState<Record<string, boolean>>({});

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
      const { files: filesList, buckets: bucketsList } = await listFilesS3(credentials);
      
      // Debug logging
      console.log('API Response - Buckets from API:', bucketsList);
      console.log('API Response - Files count:', filesList.length);
      console.log('API Response - Files with buckets:', filesList.filter(f => f.bucket).map(f => f.bucket));
      
      setFiles(filesList);
      
      // Collect all unique buckets from both the API response and file bucket properties
      const allBucketsSet = new Set(bucketsList);
      // Also include buckets from files (in case some buckets aren't in the buckets list)
      filesList.forEach(file => {
        if (file.bucket) {
          allBucketsSet.add(file.bucket);
        }
      });
      
      // Update buckets state with all buckets (including those from files)
      const allBucketsArray = Array.from(allBucketsSet);
      console.log('All buckets (including from files):', allBucketsArray);
      setBuckets(allBucketsArray);
      
      // Expand all buckets by default
      setExpandedBuckets(allBucketsSet);

      // For account info, we can calculate from files or call API if available
      // Calculate total storage used from files
      const totalSize = filesList.reduce((sum, file) => {
        // Parse size string like "0.05 MB" or "341.20 MB"
        const sizeMatch = file.size.match(/([\d.]+)\s*(MB|GB|KB|TB)/i);
        if (!sizeMatch) return sum;
        const value = parseFloat(sizeMatch[1]);
        const unit = sizeMatch[2].toUpperCase();
        
        // Convert to MB
        let sizeMB = value;
        if (unit === 'KB') sizeMB = value / 1024;
        else if (unit === 'GB') sizeMB = value * 1024;
        else if (unit === 'TB') sizeMB = value * 1024 * 1024;
        
        return sum + sizeMB;
      }, 0);

      // Clear old hardcoded email from localStorage if it exists
      if (typeof window !== 'undefined') {
        const storedEmail = localStorage.getItem('storx_user_email');
        if (storedEmail === 'user@storx.io') {
          localStorage.removeItem('storx_user_email');
        }
      }

      // Try to extract email from file keys or bucket names
      // File keys often contain email as the first part: "email@domain.com/filename"
      const getEmail = (): string | null => {
        // Check file keys - they often have email as the first part before '/'
        for (const file of filesList) {
          if (file.key) {
            // Extract first part of key (before first '/')
            const firstPart = file.key.split('/')[0];
            // Check if it looks like an email
            if (firstPart.includes('@') && firstPart.includes('.')) {
              const emailMatch = firstPart.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
              if (emailMatch) {
                return emailMatch[0];
              }
            }
          }
        }
        
        // Check if any bucket looks like an email
        const emailBucket = bucketsList.find(bucket => {
          const emailMatch = bucket.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
          return emailMatch !== null;
        });
        if (emailBucket) {
          return emailBucket;
        }
        
        // Check files for email-like bucket names
        const emailFromFiles = filesList.find(file => {
          if (file.bucket) {
            const emailMatch = file.bucket.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
            return emailMatch !== null;
          }
          return false;
        });
        if (emailFromFiles?.bucket) {
          return emailFromFiles.bucket;
        }
        
        // Try to get from localStorage if stored (and it's not the default)
        if (typeof window !== 'undefined') {
          const storedEmail = localStorage.getItem('storx_user_email');
          if (storedEmail && storedEmail !== 'user@storx.io' && storedEmail.includes('@')) {
            return storedEmail;
          }
        }
        
        // Return null if no email found (don't use default)
        return null;
      };

      const userEmail = getEmail();
      
      // Only store email in localStorage if we found a real email (not default)
      if (userEmail && typeof window !== 'undefined') {
        localStorage.setItem('storx_user_email', userEmail);
      }

      // Default storage limit (can be made configurable or fetched from API)
      const defaultStorageLimit = '100 GB';

      setAccountInfo({
        email: userEmail || 'Not available', // Use 'Not available' instead of hardcoded email
        storageUsed: totalSize >= 1024 
          ? `${(totalSize / 1024).toFixed(2)} GB` 
          : `${totalSize.toFixed(2)} MB`,
        storageLimit: defaultStorageLimit,
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, bucketName: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingBuckets(prev => ({ ...prev, [bucketName]: true }));
      setError(null);

      const credentials = getS3Credentials();
      if (!credentials) {
        throw new Error('No S3 credentials available');
      }

      // Upload file using S3 PutObject
      const formData = new FormData();
      formData.append('file', file);
      formData.append('credentials', JSON.stringify(credentials));
      formData.append('bucketName', bucketName);

      const response = await fetch('/api/storx/s3/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to upload file' }));
        throw new Error(errorData.error || errorData.message || 'Failed to upload file');
      }

      const result = await response.json();
      console.log('Upload successful:', result);

      // Refresh file list
      await fetchData();
      e.target.value = ''; // Reset file input
    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload file');
    } finally {
      setUploadingBuckets(prev => ({ ...prev, [bucketName]: false }));
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

      // Use /api/storx/s3/delete endpoint with S3 credentials
      if (!file.key || !file.bucket) {
        throw new Error('File key or bucket is missing');
      }

      const response = await fetch('/api/storx/s3/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key: file.key, // S3 object key
          bucket: file.bucket, // S3 bucket name
          credentials,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to delete file' }));
        throw new Error(errorData.error || errorData.message || 'Failed to delete file');
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

  const handleOpen = async (file: StorXFile) => {
    // Check if it's a Gmail file (ends with .gmail) or JSON file
    const isGmailFile = file.fileName.endsWith('.gmail') || file.fileName.endsWith('.json');
    
    if (isGmailFile) {
      // Show in modal for Gmail files
      setFileToView(file);
      setViewerModalOpen(true);
    } else {
      // Open in new tab for other files
      try {
        const credentials = getS3Credentials();
        if (!credentials) {
          throw new Error('No S3 credentials available');
        }

        if (!file.key || !file.bucket) {
          throw new Error('File key or bucket is missing');
        }

        const response = await fetch('/api/storx/s3/download', {
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
          const errorData = await response.json().catch(() => ({ error: 'Failed to get file URL' }));
          throw new Error(errorData.error || 'Failed to get file URL');
        }

        const data = await response.json();
        if (data.url) {
          window.open(data.url, '_blank');
        }
      } catch (err) {
        console.error('Open file error:', err);
        setError(err instanceof Error ? err.message : 'Failed to open file');
      }
    }
  };

  const handleDownload = async (file: StorXFile) => {
    try {
      // For download, we trigger the browser's download instead of opening in new tab
      const credentials = getS3Credentials();
      if (!credentials) {
        throw new Error('No S3 credentials available');
      }

      if (!file.key || !file.bucket) {
        throw new Error('File key or bucket is missing');
      }

      const response = await fetch('/api/storx/s3/download', {
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
        const errorData = await response.json().catch(() => ({ error: 'Failed to get download URL' }));
        throw new Error(errorData.error || 'Failed to get download URL');
      }

      const data = await response.json();
      if (data.url) {
        // Create a temporary anchor element to trigger download
        const link = document.createElement('a');
        link.href = data.url;
        link.download = file.fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      console.error('Download error:', err);
      setError(err instanceof Error ? err.message : 'Failed to download file');
    }
  };

  const handleCreateBucket = async () => {
    if (!bucketName.trim()) {
      setError('Please enter a bucket name');
      return;
    }

    try {
      setCreatingBucket(true);
      setError(null);

      const credentials = getS3Credentials();
      if (!credentials) {
        throw new Error('No S3 credentials available');
      }

      const response = await fetch('/api/storx/s3/create-bucket', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          credentials,
          bucketName: bucketName.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create bucket');
      }

      // Success - clear bucket name and refresh
      setBucketName('');
      setShowCreateBucket(false);
      await fetchData();
    } catch (err) {
      console.error('Create bucket error:', err);
      setError(err instanceof Error ? err.message : 'Failed to create bucket');
    } finally {
      setCreatingBucket(false);
    }
  };

  const handleDeleteBucketClick = (bucketName: string) => {
    setBucketToDelete(bucketName);
  };

  const handleDeleteBucketConfirm = async () => {
    if (!bucketToDelete) return;

    try {
      setDeletingBucket(bucketToDelete);
      setError(null);

      const credentials = getS3Credentials();
      if (!credentials) {
        throw new Error('No S3 credentials available');
      }

      const response = await fetch('/api/storx/s3/delete-bucket', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          credentials,
          bucketName: bucketToDelete,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to delete bucket');
      }

      // Success - close modal and refresh
      setBucketToDelete(null);
      await fetchData();
    } catch (err) {
      console.error('Delete bucket error:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete bucket');
    } finally {
      setDeletingBucket(null);
    }
  };

  const handleDeleteBucketCancel = () => {
    setBucketToDelete(null);
  };

  const formatStorage = (used: string, limit: string) => {
    // Parse storage strings like "341.20 MB" or "100 GB"
    const parseSize = (sizeStr: string): number => {
      const match = sizeStr.match(/([\d.]+)\s*(MB|GB|KB|TB)/i);
      if (!match) return 0;
      const value = parseFloat(match[1]);
      const unit = match[2].toUpperCase();
      
      // Convert everything to MB for comparison
      switch (unit) {
        case 'KB':
          return value / 1024;
        case 'MB':
          return value;
        case 'GB':
          return value * 1024;
        case 'TB':
          return value * 1024 * 1024;
        default:
          return value;
      }
    };

    const usedMB = parseSize(used);
    const limitMB = parseSize(limit);
    const percentage = limitMB > 0 ? Math.min((usedMB / limitMB) * 100, 100) : 0;
    
    return { 
      usedMB, 
      limitMB, 
      percentage: Math.round(percentage),
      usedFormatted: used,
      limitFormatted: limit
    };
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
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

      {/* Delete Bucket Confirmation Modal */}
      {bucketToDelete && (
        <DeleteConfirmModal
          isOpen={!!bucketToDelete}
          fileName={bucketToDelete}
          onConfirm={handleDeleteBucketConfirm}
          onCancel={handleDeleteBucketCancel}
          isDeleting={deletingBucket === bucketToDelete}
          itemType="bucket"
        />
      )}

      {/* File Viewer Modal */}
      <FileViewerModal
        isOpen={viewerModalOpen}
        file={fileToView}
        onClose={() => {
          setViewerModalOpen(false);
          setFileToView(null);
        }}
      />

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
          <div className="mb-6 p-4 bg-storx-red-lighter border-2 border-storx-red rounded-lg text-storx-red-dark">
            {error}
          </div>
        )}

        {/* Account Info Section */}
        {accountInfo && (
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="text-storx-red">Account Information</span>
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
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-storx-red h-2 rounded-full transition-all"
                      style={{
                        width: `${formatStorage(
                          accountInfo.storageUsed,
                          accountInfo.storageLimit
                        ).percentage}%`,
                        maxWidth: '100%',
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Create Bucket Section */}
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <span className="text-storx-red">Buckets</span>
              {buckets.length > 0 && (
                <span className="text-sm font-normal text-gray-500">
                  ({buckets.length} {buckets.length === 1 ? 'bucket' : 'buckets'})
                </span>
              )}
            </h2>
            <Button
              variant="secondary"
              onClick={() => setShowCreateBucket(!showCreateBucket)}
              disabled={creatingBucket}
            >
              {showCreateBucket ? 'Cancel' : '+ Create Bucket'}
            </Button>
          </div>
          
          {/* Display existing buckets */}
          {buckets.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Your Buckets:</p>
              <div className="flex flex-wrap gap-2">
                {buckets.map((bucket) => (
                  <div
                    key={bucket}
                    className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium bg-storx-red/10 text-storx-red border border-storx-red/20"
                  >
                    <span>📦 {bucket}</span>
                    <button
                      onClick={() => handleDeleteBucketClick(bucket)}
                      disabled={deletingBucket === bucket}
                      className="ml-1 text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      title="Delete bucket"
                    >
                      {deletingBucket === bucket ? (
                        <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {showCreateBucket && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bucket Name
                  </label>
                  <input
                    type="text"
                    value={bucketName}
                    onChange={(e) => setBucketName(e.target.value)}
                    placeholder="Enter bucket name (e.g., my-bucket)"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-storx-red focus:border-transparent"
                    disabled={creatingBucket}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !creatingBucket) {
                        handleCreateBucket();
                      }
                    }}
                  />
                </div>
                <Button
                  variant="primary"
                  onClick={handleCreateBucket}
                  isLoading={creatingBucket}
                  disabled={creatingBucket || !bucketName.trim()}
                >
                  {creatingBucket ? 'Creating...' : 'Create'}
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Bucket names must be unique and follow S3 naming conventions (lowercase, no spaces)
              </p>
            </div>
          )}
        </div>


        {/* Files List Section */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-storx-red/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-storx-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Your Files
                </h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  {files.length} {files.length === 1 ? 'file' : 'files'} across {buckets.length} {buckets.length === 1 ? 'bucket' : 'buckets'}
                </p>
              </div>
            </div>
            <Button 
              variant="secondary" 
              onClick={fetchData} 
              disabled={loading}
              className="flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </Button>
          </div>

          {loading ? (
            <div className="text-center py-16">
              <div className="inline-block animate-spin rounded-full h-14 w-14 border-4 border-storx-red/20 border-t-storx-red"></div>
              <p className="mt-6 text-gray-600 font-medium">Loading files...</p>
              <p className="text-sm text-gray-400 mt-2">Please wait</p>
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-16">
              <div className="inline-block text-6xl mb-4">📁</div>
              <p className="text-gray-700 text-xl font-semibold">No files found</p>
              <p className="text-gray-500 mt-2">
                Upload your first file to get started!
              </p>
            </div>
          ) : (
            <div>
              {(() => {
                // Group files by bucket
                const filesByBucket = files.reduce((acc, file) => {
                  const bucket = file.bucket || 'default';
                  if (!acc[bucket]) {
                    acc[bucket] = [];
                  }
                  acc[bucket].push(file);
                  return acc;
                }, {} as Record<string, StorXFile[]>);

                // Get all unique buckets (including those with files)
                const allBuckets = Array.from(new Set([
                  ...buckets,
                  ...Object.keys(filesByBucket)
                ]));

                // Debug logging
                console.log('Rendering - Total files:', files.length);
                console.log('Rendering - Buckets state:', buckets);
                console.log('Rendering - Files by bucket keys:', Object.keys(filesByBucket));
                console.log('Rendering - All buckets to render:', allBuckets);
                console.log('Rendering - Files by bucket:', Object.entries(filesByBucket).map(([k, v]) => [k, v.length]));
                console.log('Rendering - Sample files:', files.slice(0, 3).map(f => ({ fileName: f.fileName, bucket: f.bucket })));

                // Sort buckets to ensure consistent ordering
                const sortedBuckets = allBuckets.sort((a, b) => a.localeCompare(b));

                return sortedBuckets.map((bucket) => {
                  const bucketFiles = filesByBucket[bucket] || [];
                  const isExpanded = expandedBuckets.has(bucket);
                  
                  console.log(`Rendering bucket "${bucket}" with ${bucketFiles.length} files, expanded: ${isExpanded}`);
                  
                  return (
                    <div
                      key={bucket}
                      className="border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200 mb-4"
                    >
                      {/* Bucket Folder Header */}
                      <div
                        className="bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 cursor-pointer px-5 py-4 flex items-center justify-between transition-all duration-200 border-b border-gray-200"
                        onClick={() => {
                          const newExpanded = new Set(expandedBuckets);
                          if (isExpanded) {
                            newExpanded.delete(bucket);
                          } else {
                            newExpanded.add(bucket);
                          }
                          setExpandedBuckets(newExpanded);
                        }}
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-storx-red/10 flex items-center justify-center text-2xl">
                            {isExpanded ? '📂' : '📁'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-lg text-gray-900 truncate">
                              {bucket}
                            </h3>
                            <p className="text-sm text-gray-600 mt-0.5">
                              {bucketFiles.length} {bucketFiles.length === 1 ? 'file' : 'files'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <svg 
                            className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>

                      {/* Bucket Files (shown when expanded) */}
                      {isExpanded && (
                        <div className="bg-gray-50/50 border-t border-gray-200">
                          {/* Upload and Delete Section for this bucket */}
                          <div className="p-4 border-b border-gray-200 bg-white">
                            <div className="flex items-center gap-4 flex-wrap">
                              <input
                                ref={(el) => {
                                  fileInputRefs.current[bucket] = el;
                                }}
                                type="file"
                                className="hidden"
                                onChange={(e) => handleFileUpload(e, bucket)}
                                disabled={uploadingBuckets[bucket] || false}
                              />
                              <Button
                                variant="primary"
                                isLoading={uploadingBuckets[bucket] || false}
                                disabled={uploadingBuckets[bucket] || false}
                                onClick={() => {
                                  const input = fileInputRefs.current[bucket];
                                  if (input && !uploadingBuckets[bucket]) {
                                    input.click();
                                  }
                                }}
                                className="flex items-center gap-2"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                </svg>
                                {uploadingBuckets[bucket] ? 'Uploading...' : 'Upload File'}
                              </Button>
                              <Button
                                variant="danger"
                                isLoading={deletingBucket === bucket}
                                disabled={deletingBucket === bucket}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteBucketClick(bucket);
                                }}
                                className="flex items-center gap-2"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                {deletingBucket === bucket ? 'Deleting...' : 'Delete Bucket'}
                              </Button>
                              <p className="text-sm text-gray-500">
                                Upload files to <span className="font-semibold text-storx-red">{bucket}</span> bucket
                              </p>
                            </div>
                          </div>

                          {bucketFiles.length === 0 ? (
                            <div className="p-12 text-center">
                              <div className="inline-block text-4xl mb-3">📭</div>
                              <p className="text-gray-500 font-medium">No files in this bucket</p>
                              <p className="text-sm text-gray-400 mt-1">Upload files to get started</p>
                            </div>
                          ) : (
                            <div className="p-5">
                              {/* Breadcrumb Navigation */}
                              <div className="mb-4 flex items-center gap-2 text-sm text-gray-600">
                                <span className="font-medium text-gray-900">Vaults</span>
                                <span>/</span>
                                <button
                                  onClick={() => {
                                    const newPaths = { ...bucketPaths };
                                    newPaths[bucket] = '';
                                    setBucketPaths(newPaths);
                                  }}
                                  className="font-medium text-gray-900 hover:text-storx-red transition-colors"
                                >
                                  {bucket}
                                </button>
                                {bucketPaths[bucket] && bucketPaths[bucket].split('/').map((part, index, arr) => {
                                  if (!part) return null;
                                  const path = arr.slice(0, index + 1).join('/');
                                  return (
                                    <React.Fragment key={path}>
                                      <span>/</span>
                                      <button
                                        onClick={() => {
                                          const newPaths = { ...bucketPaths };
                                          newPaths[bucket] = path;
                                          setBucketPaths(newPaths);
                                        }}
                                        className="font-medium text-gray-900 hover:text-storx-red transition-colors"
                                      >
                                        {part}
                                      </button>
                                    </React.Fragment>
                                  );
                                })}
                              </div>
                              <FileList
                                files={bucketFiles}
                                onDelete={(fileId) => {
                                  const file = bucketFiles.find(f => f.id === fileId);
                                  if (file) {
                                    handleDeleteClick(fileId, file.fileName);
                                  }
                                }}
                                onDeleteFolder={(folderPath) => {
                                  // Delete all files in the folder
                                  const filesInFolder = bucketFiles.filter(file => {
                                    if (!file.key) return false;
                                    const filePath = file.key.split('/').slice(0, -1).join('/');
                                    return filePath === folderPath || filePath.startsWith(folderPath + '/');
                                  });
                                  
                                  // Delete each file in the folder
                                  filesInFolder.forEach(file => {
                                    handleDeleteClick(file.id, file.fileName);
                                  });
                                }}
                                onDownload={handleDownload}
                                onOpen={handleOpen}
                                deletingFileId={deletingFileId}
                                currentPath={bucketPaths[bucket] || ''}
                                onNavigate={(path) => {
                                  const newPaths = { ...bucketPaths };
                                  newPaths[bucket] = path;
                                  setBucketPaths(newPaths);
                                }}
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

