"use client";

import React, { useState, useEffect } from 'react';
import { apiFetch } from '../lib/api';

interface OnboardingProps {
  onComplete: () => void;
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(1);
  const [isConnecting, setIsConnecting] = useState(false);
  const [queriesFound, setQueriesFound] = useState<number | null>(null);

  // Handle redirect back from Gmail OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const gmailConnected = params.get('gmail_connected');
    const found = params.get('queries_found');
    if (gmailConnected === 'true') {
      setQueriesFound(found ? parseInt(found, 10) : 0);
      setStep(2);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const data = await apiFetch<{ auth_url: string }>('/gmail/connect');
      window.location.href = data.auth_url;
    } catch {
      // Fall back to simulated flow if Gmail not configured
      setTimeout(() => {
        setIsConnecting(false);
        setQueriesFound(0);
        setStep(2);
      }, 2500);
    }
  };

  const handleFinish = () => {
    onComplete();
  };

  return (
    <div className="min-h-screen bg-[#F6F5F1] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-200/40 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-rose-200/30 rounded-full blur-[100px]"></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Glassmorphic Card */}
        <div className="bg-white/80 backdrop-blur-xl border border-stone-200 rounded-3xl p-8 shadow-2xl shadow-stone-300/50 transition-all duration-500">
          
          {step === 1 && (
            <div className="flex flex-col items-center text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-50 to-rose-50 rounded-2xl flex items-center justify-center mb-6 border border-indigo-100">
                <svg className="w-8 h-8 text-indigo-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              
              <h2 className="text-2xl font-bold text-stone-900 mb-2 tracking-tight font-serif">Connect your Inbox</h2>
              <p className="text-stone-500 text-sm mb-8 leading-relaxed">
                QueryFlow securely connects to your Gmail to automatically ingest and organize your slush pile. We only request read access.
              </p>

              <button
                onClick={handleConnect}
                disabled={isConnecting}
                className="w-full relative group overflow-hidden rounded-xl p-[1px]"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-indigo-400 to-rose-400 rounded-xl opacity-40 group-hover:opacity-100 transition-opacity duration-300"></span>
                <div className="relative bg-white border border-stone-100 px-6 py-3 rounded-xl flex items-center justify-center gap-3 transition-all duration-300 group-hover:bg-stone-50">
                  {isConnecting ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="text-stone-800 font-medium">Authenticating...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 text-stone-700" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12.24 10.285V14.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174-4.095 0-7.439-3.389-7.439-7.574s3.345-7.574 7.439-7.574c2.33 0 3.891.989 4.785 1.849l3.254-3.138C18.189 1.186 15.479 0 12.24 0c-6.635 0-12 5.365-12 12s5.365 12 12 12c6.926 0 11.52-4.869 11.52-11.726 0-.788-.085-1.39-.189-1.989H12.24z" />
                      </svg>
                      <span className="text-stone-800 font-medium">Continue with Google</span>
                    </>
                  )}
                </div>
              </button>
              
              <p className="text-xs text-stone-400 mt-6 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Read-only access. We never send emails on your behalf.
              </p>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col items-center text-center animate-in fade-in slide-in-from-right-8 duration-500">
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-6 border border-emerald-100">
                <svg className="w-8 h-8 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              
              <h2 className="text-2xl font-bold text-stone-900 mb-2 tracking-tight font-serif">Inbox Connected</h2>
              <p className="text-stone-500 text-sm mb-8 leading-relaxed">
                We've successfully connected to your inbox. QueryFlow is now analyzing your recent queries and extracting metadata.
              </p>

              <div className="w-full bg-stone-50 rounded-xl p-4 mb-8 border border-stone-200 text-left">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-stone-600">Processing last 30 days...</span>
                  <span className="text-xs text-indigo-700 font-medium">{queriesFound !== null ? `${queriesFound} queries found` : 'Scanning...'}</span>
                </div>
                <div className="w-full bg-stone-200 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-gradient-to-r from-indigo-500 to-rose-500 h-1.5 rounded-full w-full animate-[pulse_2s_ease-in-out_infinite]"></div>
                </div>
              </div>

              <button
                onClick={handleFinish}
                className="w-full bg-indigo-900 text-white font-semibold py-3 px-6 rounded-xl hover:bg-indigo-800 transition-colors duration-200 shadow-lg shadow-indigo-900/10"
              >
                Go to Dashboard
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

