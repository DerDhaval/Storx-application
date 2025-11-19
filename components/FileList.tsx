'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { StorXFile } from '@/lib/storx';
import FileCard from './FileCard';

interface FileListProps {
  files: StorXFile[];
  onDelete: (fileId: string) => void;
  onDeleteFolder?: (folderPath: string) => void;
  onDownload: (file: StorXFile) => void;
  onOpen?: (file: StorXFile) => void;
  deletingFileId: string | null;
  currentPath?: string;
  onNavigate?: (path: string) => void;
}

type ViewMode = 'list' | 'grid';

export default function FileList({
  files,
  onDelete,
  onDeleteFolder,
  onDownload,
  onOpen,
  deletingFileId,
  currentPath = '',
  onNavigate,
}: FileListProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.folder-menu-container')) {
        setOpenMenu(null);
      }
    };

    if (openMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [openMenu]);

  // Separate folders and files
  const { folders, fileList } = useMemo(() => {
    const folderMap = new Map<string, { name: string; path: string; fileCount: number }>();
    const fileList: StorXFile[] = [];

    console.log('FileList - currentPath:', currentPath);
    console.log('FileList - files count:', files.length);

    files.forEach((file) => {
      if (!file.key) {
        fileList.push(file);
        return;
      }

      const parts = file.key.split('/');
      const fileName = parts.pop() || '';

      // If file is in current path, show it
      if (currentPath === '') {
        // Root level - show folders and root files
        if (parts.length > 0) {
          const folderName = parts[0];
          const folderPath = folderName;
          if (!folderMap.has(folderPath)) {
            folderMap.set(folderPath, {
              name: folderName,
              path: folderPath,
              fileCount: 0,
            });
          }
          folderMap.get(folderPath)!.fileCount++;
        } else {
          // Root level file
          fileList.push({ ...file, fileName });
        }
      } else {
        // Inside a folder - show files in current path
        const pathParts = currentPath.split('/');
        const filePathPrefix = parts.slice(0, pathParts.length).join('/');
        
        // Check if file belongs to current path
        if (filePathPrefix === currentPath) {
          const remainingParts = parts.slice(pathParts.length);
          if (remainingParts.length > 0) {
            // There's a subfolder
          if (remainingParts.length > 1) {
            // There's a subfolder
            const folderName = remainingParts[0];
            const folderPath = `${currentPath}/${folderName}`;
            if (!folderMap.has(folderPath)) {
              folderMap.set(folderPath, {
                name: folderName,
                path: folderPath,
                fileCount: 0,
              });
            }
            folderMap.get(folderPath)!.fileCount++;
          } else {
              // There's exactly one remaining part - it's a subfolder
              const folderName = remainingParts[0];
              const folderPath = `${currentPath}/${folderName}`;
              if (!folderMap.has(folderPath)) {
                folderMap.set(folderPath, {
                  name: folderName,
                  path: folderPath,
                  fileCount: 0,
                });
              }
              folderMap.get(folderPath)!.fileCount++;
            }
          } else {
            // File is directly in the current path (no remaining parts after matching path)
            // This means the file is directly in the current folder
            fileList.push({ ...file, fileName });
          }
        }
      }
    });

    return {
      folders: Array.from(folderMap.values()).sort((a, b) => a.name.localeCompare(b.name)),
      fileList: fileList.sort((a, b) => a.fileName.localeCompare(b.fileName)),
    };
  }, [files, currentPath]);

  // Filter by search query
  const filteredFolders = useMemo(() => {
    if (!searchQuery) return folders;
    return folders.filter((folder) =>
      folder.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [folders, searchQuery]);

  const filteredFiles = useMemo(() => {
    if (!searchQuery) return fileList;
    return fileList.filter((file) =>
      file.fileName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [fileList, searchQuery]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return '—';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return '—';
    }
  };

  const handleFolderClick = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    }
  };

  const handleBack = () => {
    if (onNavigate && currentPath) {
      const pathParts = currentPath.split('/');
      pathParts.pop();
      onNavigate(pathParts.join('/'));
    }
  };

  if (viewMode === 'grid') {
    return (
      <div className="space-y-4">
        {/* Search and View Toggle */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <input
                type="text"
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-storx-red focus:border-transparent"
              />
              <svg
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('list')}
              className="p-2 rounded-lg transition-colors bg-gray-100 text-gray-600 hover:bg-gray-200"
              title="List view"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className="p-2 rounded-lg transition-colors bg-storx-red text-white"
              title="Grid view"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Grid View */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {currentPath && (
            <div
              onClick={handleBack}
              className="bg-white border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer hover:border-storx-red hover:bg-storx-red/5 transition-all"
            >
              <svg className="w-8 h-8 text-gray-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <div className="font-semibold text-gray-700">Back</div>
            </div>
          )}
          {filteredFolders.map((folder) => (
            <div
              key={folder.path}
              onClick={() => handleFolderClick(folder.path)}
              className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer hover:border-storx-red hover:shadow-md transition-all"
            >
              <div className="text-5xl mb-3">📁</div>
              <div className="font-semibold text-gray-900 text-center truncate w-full">{folder.name}</div>
              <div className="text-sm text-gray-500 mt-1">{folder.fileCount} items</div>
            </div>
          ))}
          {filteredFiles.map((file) => (
            <div key={file.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all">
              <FileCard
                file={file}
                onDelete={onDelete}
                onDownload={onDownload}
                onOpen={onOpen}
                isDeleting={deletingFileId === file.id}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and View Toggle */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <input
              type="text"
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-storx-red focus:border-transparent"
            />
            <svg
              className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('list')}
            className="p-2 rounded-lg transition-colors bg-storx-red text-white"
            title="List view"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className="p-2 rounded-lg transition-colors bg-gray-100 text-gray-600 hover:bg-gray-200"
            title="Grid view"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Table View */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        <table className="w-full min-w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                NAME
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                SIZE
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                UPLOAD DATE
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                ACTIONS
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {currentPath && (
              <tr
                onClick={handleBack}
                className="hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <svg className="w-5 h-5 text-gray-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    <span className="font-medium text-gray-900">Back</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">—</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">—</td>
                <td className="px-6 py-4 whitespace-nowrap text-right"></td>
              </tr>
            )}
            {filteredFolders.map((folder) => (
              <tr
                key={folder.path}
                onClick={() => handleFolderClick(folder.path)}
                className="hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-2xl flex-shrink-0">📁</span>
                    <span className="font-medium text-gray-900 truncate">{folder.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">—</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">—</td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <div className="relative folder-menu-container">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenu(openMenu === folder.path ? null : folder.path);
                      }}
                      className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                      </svg>
                    </button>
                    {openMenu === folder.path && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                        <div className="py-1">
                          {onDeleteFolder && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(`Are you sure you want to delete the folder "${folder.name}" and all its contents?`)) {
                                  onDeleteFolder(folder.path);
                                  setOpenMenu(null);
                                }
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Delete Folder
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filteredFiles.map((file) => {
              const isGmailFile = file.fileName.endsWith('.gmail') || file.fileName.endsWith('.json');
              const handleRowClick = (e: React.MouseEvent) => {
                // Don't trigger if clicking on buttons
                if ((e.target as HTMLElement).closest('button')) {
                  return;
                }
                if (onOpen && isGmailFile) {
                  onOpen(file);
                }
              };

              return (
              <tr 
                key={file.id} 
                className={`transition-colors ${isGmailFile && onOpen ? 'hover:bg-gray-50 cursor-pointer' : 'hover:bg-gray-50'}`}
                onClick={isGmailFile && onOpen ? handleRowClick : undefined}
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xl flex-shrink-0">{isGmailFile ? '📧' : '📄'}</span>
                    <span className="font-medium text-gray-900 truncate">
                      {file.fileName}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{file.size}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(file.uploadedAt)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                    {onOpen && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpen(file);
                        }}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title={isGmailFile ? "View Gmail" : "Open"}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDownload(file);
                      }}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="Download"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(file.id);
                      }}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Delete"
                      disabled={deletingFileId === file.id}
                    >
                      {deletingFileId === file.id ? (
                        <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      )}
                    </button>
                  </div>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
        {(filteredFolders.length === 0 && filteredFiles.length === 0) && (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">📭</div>
            <p className="text-gray-500 font-medium">No files found</p>
            {searchQuery && (
              <p className="text-sm text-gray-400 mt-1">Try a different search term</p>
            )}
          </div>
        )}
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-500">
          {filteredFolders.length + filteredFiles.length} {filteredFolders.length + filteredFiles.length === 1 ? 'item' : 'items'}
        </div>
      </div>
    </div>
  );
}

