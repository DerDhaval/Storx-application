'use client';

import React, { useState } from 'react';
import { StorXFile } from '@/lib/storx';
import FileCard from './FileCard';

interface FolderNode {
  name: string;
  path: string;
  files: StorXFile[];
  children: Map<string, FolderNode>;
}

interface FolderTreeProps {
  files: StorXFile[];
  onDelete: (fileId: string) => void;
  onDownload: (file: StorXFile) => void;
  onOpen?: (file: StorXFile) => void;
  deletingFileId: string | null;
}

export default function FolderTree({
  files,
  onDelete,
  onDownload,
  onOpen,
  deletingFileId,
}: FolderTreeProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  // Build folder tree from file keys
  const buildFolderTree = (files: StorXFile[]): FolderNode => {
    const root: FolderNode = {
      name: '',
      path: '',
      files: [],
      children: new Map(),
    };

    files.forEach((file) => {
      if (!file.key) return;

      const parts = file.key.split('/');
      const fileName = parts.pop() || '';
      
      // If no folder path, add to root
      if (parts.length === 0) {
        root.files.push(file);
        return;
      }

      // Navigate/create folder structure
      let current = root;
      let currentPath = '';

      parts.forEach((part, index) => {
        currentPath = currentPath ? `${currentPath}/${part}` : part;

        if (!current.children.has(part)) {
          current.children.set(part, {
            name: part,
            path: currentPath,
            files: [],
            children: new Map(),
          });
        }

        current = current.children.get(part)!;

        // If this is the last folder, add the file here
        if (index === parts.length - 1) {
          current.files.push({
            ...file,
            fileName: fileName,
          });
        }
      });
    });

    return root;
  };

  const toggleFolder = (path: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedFolders(newExpanded);
  };

  const countItems = (node: FolderNode): number => {
    let count = node.files.length;
    Array.from(node.children.values()).forEach((child) => {
      count += countItems(child);
    });
    return count;
  };

  const renderFolder = (node: FolderNode, level: number = 0): React.ReactNode => {
    const isExpanded = expandedFolders.has(node.path);
    const hasContent = node.files.length > 0 || node.children.size > 0;

    if (!hasContent && level === 0) {
      return null;
    }

    const indent = level * 20;
    const itemCount = countItems(node);

    return (
      <div key={node.path || 'root'} className="folder-node">
        {/* Folder Header */}
        {node.path && (
          <div
            className="flex items-center gap-2 py-2.5 px-4 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors mb-1 group"
            style={{ marginLeft: `${indent}px` }}
            onClick={() => toggleFolder(node.path)}
          >
            <svg
              className={`w-4 h-4 text-gray-500 transition-transform duration-200 flex-shrink-0 ${isExpanded ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-xl mr-1.5 flex-shrink-0">
              {isExpanded ? '📂' : '📁'}
            </span>
            <span className="font-semibold text-gray-800 group-hover:text-storx-red transition-colors">
              {node.name}
            </span>
            <span className="text-xs text-gray-500 ml-2 bg-gray-200 px-2 py-0.5 rounded-full">
              {itemCount} {itemCount === 1 ? 'item' : 'items'}
            </span>
          </div>
        )}

        {/* Folder Content */}
        {(!node.path || isExpanded) && (
          <div className="folder-content">
            {/* Render files in this folder */}
            {node.files.length > 0 && (
              <div className="files-container mb-2" style={{ marginLeft: `${indent + 28}px` }}>
                {node.files.map((file) => (
                  <div key={file.id} className="mb-3">
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
            )}

            {/* Render child folders */}
            {Array.from(node.children.values())
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((child) => renderFolder(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const root = buildFolderTree(files);

  // Auto-expand root level
  React.useEffect(() => {
    if (expandedFolders.size === 0) {
      setExpandedFolders(new Set(['']));
    }
  }, []);

  return (
    <div className="folder-tree">
      {root.files.length > 0 && (
        <div className="root-files mb-4">
          {root.files.map((file) => (
            <div key={file.id} className="mb-3">
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
      )}
      {Array.from(root.children.values())
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((child) => renderFolder(child, 0))}
    </div>
  );
}

