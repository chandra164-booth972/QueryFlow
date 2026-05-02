"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, clearToken } from '../lib/api';

export default function Home() {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('queryflow_token');
    if (token) {
      apiFetch<{ id: string }>('/auth/me')
        .then(() => setAuthed(true))
        .catch(() => { clearToken(); setAuthed(false); });
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#F6F5F1] font-sans overflow-x-hidden">
      {/* Background blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-15%] right-[-10%] w-[50%] h-[50%] bg-indigo-200/30 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-15%] left-[-10%] w-[50%] h-[50%] bg-rose-200/20 rounded-full blur-[120px]"></div>
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-5 max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-indigo-700 to-rose-700 rounded-xl flex items-center justify-center shadow-md">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-indigo-900 to-rose-800 bg-clip-text text-transparent font-serif">
            QueryFlow
          </span>
        </div>
        {authed ? (
          <button
            onClick={() => router.push('/app')}
            className="bg-indigo-900 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-indigo-800 transition-colors shadow-md shadow-indigo-900/10"
          >
            Go to App
          </button>
        ) : (
          <button
            onClick={() => router.push('/signin')}
            className="bg-indigo-900 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-indigo-800 transition-colors shadow-md shadow-indigo-900/10"
          >
            Sign In
          </button>
        )}
      </nav>

      {/* Hero */}
      <section className="relative z-10 max-w-4xl mx-auto px-8 pt-20 pb-24 text-center">
        <div className="inline-flex items-center gap-2 bg-white/70 border border-stone-200 rounded-full px-4 py-1.5 text-xs font-medium text-stone-600 mb-8 shadow-sm">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
          Client query management, reimagined
        </div>

        <h1 className="text-5xl sm:text-6xl font-bold text-stone-900 leading-tight mb-6 font-serif">
          Every client query,
          <br />
          <span className="bg-gradient-to-r from-indigo-700 to-rose-700 bg-clip-text text-transparent">
            handled with clarity.
          </span>
        </h1>

        <p className="text-lg text-stone-500 max-w-2xl mx-auto mb-10 leading-relaxed">
          QueryFlow makes your query management more efficient — so you save hours every week from email chaos to do the high quality editing and relationship-building that you actually care about.
        </p>

        <div className="flex items-center justify-center gap-4 flex-wrap">
          <button
            onClick={() => router.push(authed ? '/app' : '/signin')}
            className="bg-indigo-900 text-white font-semibold px-8 py-3.5 rounded-xl hover:bg-indigo-800 transition-colors shadow-lg shadow-indigo-900/15 text-sm"
          >
            {authed ? 'Open App' : 'Get started free'}
          </button>
          {!authed && (
            <button
              onClick={() => router.push('/signin')}
              className="bg-white/80 border border-stone-200 text-stone-700 font-semibold px-8 py-3.5 rounded-xl hover:bg-white transition-colors shadow-sm text-sm"
            >
              Sign in
            </button>
          )}
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 max-w-5xl mx-auto px-8 pb-24">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {[
            {
              icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0H4" />
                </svg>
              ),
              title: 'Inbox → Board',
              desc: 'Queries from email land directly on your kanban board, pre-categorized.',
            },
            {
              icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              ),
              title: 'Track & assign',
              desc: 'Assign owners, set due dates, and never lose context on a pending reply.',
            },
            {
              icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              ),
              title: 'Close the loop',
              desc: 'One-click replies with thread context keep clients informed and happy.',
            },
          ].map((f) => (
            <div key={f.title} className="bg-white/70 border border-stone-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-9 h-9 bg-indigo-50 text-indigo-700 rounded-lg flex items-center justify-center mb-4">
                {f.icon}
              </div>
              <h3 className="font-semibold text-stone-900 mb-1.5 font-serif">{f.title}</h3>
              <p className="text-sm text-stone-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-stone-200 py-6 text-center text-xs text-stone-400">
        © {new Date().getFullYear()} QueryFlow. All rights reserved.
      </footer>
    </div>
  );
}
