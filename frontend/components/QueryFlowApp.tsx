"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Onboarding from './Onboarding';
import Inbox from './Inbox';
import Kanban from './Kanban';
import { apiFetch, clearToken } from '../lib/api';
import { Query } from '../lib/mockData';

type View = 'inbox' | 'pipeline' | 'editors';

interface ApiQuery {
  id: string;
  author_name: string;
  book_title: string;
  email_subject: string;
  email_body: string;
  date_received: string;
  status: Query['status'];
  ai_metadata: {
    genre: string;
    word_count: string;
    comps: string[];
    summary: string;
    fit_score: 'High' | 'Medium' | 'Low';
    fit_reason: string;
    confidence: number;
    ai_processed: boolean;
  };
  submissions: {
    editor_name: string;
    imprint: string;
    date_sent: string;
    status: 'Sent' | 'Reading' | 'Passed' | 'Offer';
    follow_up_date?: string;
  }[];
}

function apiQueryToFrontend(q: ApiQuery): Query {
  return {
    id: q.id,
    authorName: q.author_name,
    bookTitle: q.book_title,
    emailSubject: q.email_subject,
    emailBody: q.email_body,
    dateReceived: q.date_received,
    status: q.status,
    aiMetadata: {
      genre: q.ai_metadata.genre,
      wordCount: q.ai_metadata.word_count,
      comps: q.ai_metadata.comps,
      summary: q.ai_metadata.summary,
      fitScore: q.ai_metadata.fit_score,
      fitReason: q.ai_metadata.fit_reason,
      confidence: q.ai_metadata.confidence,
    },
    submissions: q.submissions?.map(s => ({
      editorName: s.editor_name,
      imprint: s.imprint,
      dateSent: s.date_sent,
      status: s.status,
      followUpDate: s.follow_up_date,
    })),
  };
}

interface UserProfile {
  id: string;
  email: string;
  name: string;
  gmail_connected: boolean;
}

export default function QueryFlowApp() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [currentView, setCurrentView] = useState<View>('inbox');
  const [queries, setQueries] = useState<Query[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);

  const fetchQueries = useCallback(async () => {
    try {
      const data = await apiFetch<ApiQuery[]>('/queries');
      setQueries(data.map(apiQueryToFrontend));
    } catch (err) {
      console.error('Failed to fetch queries:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setIsOnboarded(localStorage.getItem('queryflow_onboarded') === 'true');
    setMounted(true);
  }, []);

  useEffect(() => {
    apiFetch<UserProfile>('/auth/me').then(setUser).catch(() => {});
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('gmail_connected') === 'true') {
      apiFetch<UserProfile>('/auth/me').then(setUser).catch(() => {});
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (isOnboarded) {
      fetchQueries();
    } else {
      setLoading(false);
    }
  }, [isOnboarded, fetchQueries]);

  const handleSync = async () => {
    await apiFetch('/gmail/sync', { method: 'POST' });
    await new Promise(r => setTimeout(r, 2000));
    await fetchQueries();
  };

  const handleConnectGmail = async () => {
    const data = await apiFetch<{ auth_url: string }>('/gmail/connect');
    window.location.href = data.auth_url;
  };

  const handleLogout = async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } catch {
      // ignore — clear client state regardless
    }
    clearToken();
    router.push('/signin');
  };

  const handleUpdateQuery = async (updatedQuery: Query) => {
    setQueries(prev => prev.map(q => q.id === updatedQuery.id ? updatedQuery : q));
    try {
      await apiFetch(`/queries/${updatedQuery.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: updatedQuery.status }),
      });
    } catch (err) {
      console.error('Failed to update query:', err);
      fetchQueries();
    }
  };

  const handleComplete = () => {
    localStorage.setItem('queryflow_onboarded', 'true');
    setIsOnboarded(true);
  };

  if (!mounted) return null;

  if (!isOnboarded) {
    return <Onboarding onComplete={handleComplete} />;
  }

  return (
    <div className="flex h-screen bg-[#F6F5F1] text-stone-800 font-sans overflow-hidden">

      {/* Sidebar Navigation */}
      <div className="w-64 bg-white border-r border-stone-200 flex flex-col z-20">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-700 to-rose-700 rounded-lg flex items-center justify-center shadow-md shadow-indigo-900/10">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-indigo-900 to-rose-800 bg-clip-text text-transparent font-serif">
            QueryFlow
          </span>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          <button
            onClick={() => setCurrentView('inbox')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 ${
              currentView === 'inbox'
                ? 'bg-indigo-50 text-indigo-900 border border-indigo-100 shadow-sm'
                : 'text-stone-500 hover:bg-stone-50 hover:text-stone-900 border border-transparent'
            }`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <span className="font-medium">AI Inbox</span>
            {queries.filter(q => q.status === 'new').length > 0 && (
              <span className="ml-auto bg-indigo-700 text-white text-[10px] px-2 py-0.5 rounded-full">
                {queries.filter(q => q.status === 'new').length}
              </span>
            )}
          </button>

          <button
            onClick={() => setCurrentView('pipeline')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 ${
              currentView === 'pipeline'
                ? 'bg-indigo-50 text-indigo-900 border border-indigo-100 shadow-sm'
                : 'text-stone-500 hover:bg-stone-50 hover:text-stone-900 border border-transparent'
            }`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
            </svg>
            <span className="font-medium">Pipeline</span>
          </button>

          <button
            onClick={() => setCurrentView('editors')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 ${
              currentView === 'editors'
                ? 'bg-indigo-50 text-indigo-900 border border-indigo-100 shadow-sm'
                : 'text-stone-500 hover:bg-stone-50 hover:text-stone-900 border border-transparent'
            }`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span className="font-medium">Editors</span>
          </button>
        </nav>

        {user && !user.gmail_connected && (
          <div className="px-4 pb-3">
            <button
              onClick={handleConnectGmail}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm hover:bg-amber-100 transition-colors"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span className="font-medium">Connect Gmail</span>
            </button>
          </div>
        )}

        <div className="p-4 border-t border-stone-200">
          <div className="flex items-center gap-3 px-4 py-2">
            <div className="w-8 h-8 rounded-full bg-stone-100 border border-stone-300 flex items-center justify-center text-sm font-medium text-stone-700 shrink-0">
              {user ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '…'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-stone-900 truncate">{user?.name ?? '…'}</p>
              <p className="text-xs text-stone-500 truncate">{user?.email ?? ''}</p>
            </div>
            <button
              onClick={handleLogout}
              title="Log out"
              className="shrink-0 p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-[500px] bg-indigo-100/40 rounded-full blur-[120px] pointer-events-none"></div>

        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <>
            {currentView === 'inbox' && <Inbox queries={queries} onUpdateQuery={handleUpdateQuery} onSync={handleSync} />}
            {currentView === 'pipeline' && <Kanban queries={queries} onUpdateQuery={handleUpdateQuery} />}
            {currentView === 'editors' && (
              <div className="h-full flex items-center justify-center text-stone-400 flex-col">
                <svg className="w-16 h-16 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <p className="text-lg text-stone-600 font-serif">Editor Database</p>
                <p className="text-sm mt-2">Coming soon in Phase 2.</p>
              </div>
            )}
          </>
        )}
      </div>

    </div>
  );
}
