'use client';

import React from 'react';
import Link from 'next/link';
import Button from './Button';

interface NavbarProps {
  onLogout?: () => void;
  isAuthenticated?: boolean;
}

export default function Navbar({ onLogout, isAuthenticated = false }: NavbarProps) {
  return (
    <nav className="bg-white shadow-md border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href="/" className="text-2xl font-bold text-blue-600">
              StorX
            </Link>
            {isAuthenticated && (
              <Link
                href="/dashboard"
                className="ml-8 text-gray-700 hover:text-blue-600 transition-colors"
              >
                Dashboard
              </Link>
            )}
          </div>
          <div className="flex items-center gap-4">
            {isAuthenticated && onLogout && (
              <Button variant="secondary" onClick={onLogout}>
                Logout
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

