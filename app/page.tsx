'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Button from '@/components/Button';
import Navbar from '@/components/Navbar';

export default function HomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam) {
      setError(decodeURIComponent(errorParam));
    }
  }, [searchParams]);

  const handleConnect = () => {
    // Redirect to OAuth login endpoint
    window.location.href = '/api/auth/login';
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Welcome to <span className="text-storx-red">StorX</span>
          </h1>
          <p className="text-xl text-gray-600 mb-12">
            Connect your StorX account to manage your files, view storage usage,
            and access your account details.
          </p>

          {error && (
            <div className="mb-8 p-4 bg-storx-red-lighter border-2 border-storx-red rounded-lg text-storx-red-dark">
              <p className="font-semibold">Error:</p>
              <p>{error}</p>
            </div>
          )}

          <div className="flex flex-col items-center gap-6">
            <Button
              variant="primary"
              onClick={handleConnect}
              className="text-lg px-8 py-4 font-semibold"
            >
              Connect StorX Account
            </Button>

            <div className="mt-8 text-left bg-white rounded-lg shadow-lg border border-gray-200 p-6 max-w-2xl">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900 flex items-center gap-2">
                <span className="text-storx-red">What you can do:</span>
              </h2>
              <ul className="space-y-3 text-gray-700">
                <li className="flex items-start gap-3">
                  <span className="text-storx-red text-xl font-bold">✓</span>
                  <span>View all your uploaded files</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-storx-red text-xl font-bold">✓</span>
                  <span>Monitor your storage usage</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-storx-red text-xl font-bold">✓</span>
                  <span>Upload new files</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-storx-red text-xl font-bold">✓</span>
                  <span>Download and delete files</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-storx-red text-xl font-bold">✓</span>
                  <span>Access account details</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

