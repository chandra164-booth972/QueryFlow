"use client";

import React, { useState, useRef } from 'react';
import { Query } from '../lib/mockData';
import { apiFetch } from '../lib/api';

interface InboxProps {
  queries: Query[];
  onUpdateQuery: (updatedQuery: Query) => void;
  onSync?: () => Promise<void>;
}

export default function Inbox({ queries, onUpdateQuery, onSync }: InboxProps) {
  const [selectedQueryId, setSelectedQueryId] = useState<string | null>(queries[0]?.id || null);
  const [isEditingMetadata, setIsEditingMetadata] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const genreRef = useRef<HTMLInputElement>(null);
  const wordCountRef = useRef<HTMLInputElement>(null);

  const selectedQuery = queries.find(q => q.id === selectedQueryId);
  const inboxQueries = queries.filter(q => q.status === 'new' || q.status === 'reviewing');

  const handleStatusChange = (newStatus: Query['status']) => {
    if (selectedQuery) {
      onUpdateQuery({ ...selectedQuery, status: newStatus });
    }
  };

  const handleSaveOverrides = async () => {
    if (!selectedQuery) return;
    const genre = genreRef.current?.value ?? selectedQuery.aiMetadata.genre;
    const wordCount = wordCountRef.current?.value ?? selectedQuery.aiMetadata.wordCount;
    try {
      await apiFetch(`/queries/${selectedQuery.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ ai_metadata: { genre, word_count: wordCount } }),
      });
      onUpdateQuery({
        ...selectedQuery,
        aiMetadata: { ...selectedQuery.aiMetadata, genre, wordCount },
      });
    } catch (err) {
      console.error('Failed to save overrides:', err);
    }
    setIsEditingMetadata(false);
  };

  const handleSimulateEmail = (action: string) => {
    alert(`Simulating opening Gmail draft for: ${action}\n\nTo: ${selectedQuery?.authorName}\nSubject: Re: ${selectedQuery?.emailSubject}`);
  };

  return (
    <div className="flex h-full bg-transparent text-stone-800 overflow-hidden">
      
      {/* Left Panel: Query List */}
      <div className="w-1/3 border-r border-stone-200 flex flex-col bg-white/60 backdrop-blur-md">
        <div className="p-4 border-b border-stone-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-stone-900 font-serif">Inbox</h2>
          <div className="flex items-center gap-2">
            <span className="bg-indigo-50 text-indigo-800 text-xs px-2 py-1 rounded-full border border-indigo-100">
              {inboxQueries.length} Unread
            </span>
            {onSync && (
              <button
                onClick={async () => {
                  setSyncing(true);
                  try { await onSync(); } finally { setSyncing(false); }
                }}
                disabled={syncing}
                title="Sync Gmail"
                className="p-1.5 rounded-lg text-stone-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors disabled:opacity-50"
              >
                <svg className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            )}
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {inboxQueries.map((query) => (
            <div 
              key={query.id}
              onClick={() => setSelectedQueryId(query.id)}
              className={`p-4 border-b border-stone-100 cursor-pointer transition-all duration-200 ${
                selectedQueryId === query.id 
                  ? 'bg-white border-l-2 border-l-indigo-600 shadow-sm' 
                  : 'hover:bg-white/80 border-l-2 border-l-transparent'
              }`}
            >
              <div className="flex justify-between items-start mb-1">
                <h3 className={`font-medium truncate pr-2 ${selectedQueryId === query.id ? 'text-indigo-900' : 'text-stone-900'}`}>
                  {query.authorName}
                </h3>
                <span className="text-xs text-stone-500 whitespace-nowrap">
                  {new Date(query.dateReceived).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
              </div>
              <p className="text-sm text-stone-600 font-serif italic mb-2 truncate">{query.bookTitle}</p>
              
              {/* AI Quick Tags */}
              <div className="flex gap-2 mt-2">
                <span className="text-[10px] px-2 py-0.5 rounded bg-stone-100 text-stone-600 border border-stone-200 truncate max-w-[100px]">
                  {query.aiMetadata.genre}
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded border flex items-center gap-1 ${
                  query.aiMetadata.fitScore === 'High' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                  query.aiMetadata.fitScore === 'Medium' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                  'bg-stone-100 text-stone-600 border-stone-200'
                }`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    query.aiMetadata.fitScore === 'High' ? 'bg-emerald-500' :
                    query.aiMetadata.fitScore === 'Medium' ? 'bg-amber-500' :
                    'bg-stone-400'
                  }`}></div>
                  {query.aiMetadata.fitScore} Fit
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel: Query Detail & Trust Layer */}
      <div className="w-2/3 flex flex-col bg-[#F6F5F1] relative">
        {selectedQuery ? (
          <>
            {/* Header Actions */}
            <div className="p-4 border-b border-stone-200 flex justify-between items-center bg-white/80 backdrop-blur-md z-10">
              <div className="flex gap-2">
                <button 
                  onClick={() => handleStatusChange('passed')}
                  className="px-4 py-1.5 text-sm rounded-md border border-stone-200 bg-white hover:bg-stone-50 transition-colors text-stone-700 shadow-sm"
                >
                  Pass
                </button>
                <button 
                  onClick={() => {
                    handleStatusChange('requested_partial');
                    handleSimulateEmail('Request Partial');
                  }}
                  className="px-4 py-1.5 text-sm rounded-md bg-gradient-to-r from-indigo-800 to-indigo-700 hover:from-indigo-900 hover:to-indigo-800 text-white shadow-md shadow-indigo-900/10 transition-all"
                >
                  Request Partial
                </button>
                <button 
                  onClick={() => {
                    handleStatusChange('requested_full');
                    handleSimulateEmail('Request Full');
                  }}
                  className="px-4 py-1.5 text-sm rounded-md bg-gradient-to-r from-rose-800 to-rose-700 hover:from-rose-900 hover:to-rose-800 text-white shadow-md shadow-rose-900/10 transition-all"
                >
                  Request Full
                </button>
              </div>
              <button className="text-stone-400 hover:text-stone-600 transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              
              {/* Trust Layer: AI Analysis Panel */}
              <div className="mb-8 bg-gradient-to-br from-indigo-50/80 to-rose-50/80 border border-indigo-100 rounded-2xl p-5 relative overflow-hidden group shadow-sm">
                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-indigo-500 to-rose-500"></div>
                
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-indigo-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <h3 className="text-sm font-semibold text-indigo-900 uppercase tracking-wider">AI Analysis</h3>
                  </div>
                  <button
                    onClick={() => isEditingMetadata ? handleSaveOverrides() : setIsEditingMetadata(true)}
                    className="text-xs text-indigo-700 hover:text-indigo-900 underline decoration-indigo-300 underline-offset-2"
                  >
                    {isEditingMetadata ? 'Save Overrides' : 'Override AI'}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <span className="text-xs text-stone-500 block mb-1">Extracted Summary</span>
                      <p className="text-sm text-stone-800 leading-relaxed">{selectedQuery.aiMetadata.summary}</p>
                    </div>
                    
                    <div className="flex gap-4">
                      <div>
                        <span className="text-xs text-stone-500 block mb-1">Genre</span>
                        {isEditingMetadata ? (
                          <input ref={genreRef} type="text" defaultValue={selectedQuery.aiMetadata.genre} className="bg-white border border-indigo-200 rounded px-2 py-1 text-sm text-stone-900 w-full focus:outline-none focus:border-indigo-400 shadow-sm" />
                        ) : (
                          <span className="text-sm text-stone-900 font-medium">{selectedQuery.aiMetadata.genre}</span>
                        )}
                      </div>
                      <div>
                        <span className="text-xs text-stone-500 block mb-1">Word Count</span>
                        {isEditingMetadata ? (
                          <input ref={wordCountRef} type="text" defaultValue={selectedQuery.aiMetadata.wordCount} className="bg-white border border-indigo-200 rounded px-2 py-1 text-sm text-stone-900 w-full focus:outline-none focus:border-indigo-400 shadow-sm" />
                        ) : (
                          <span className="text-sm text-stone-900 font-medium">{selectedQuery.aiMetadata.wordCount}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="bg-white/60 rounded-xl p-4 border border-stone-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs text-stone-500">Fit Signal</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        selectedQuery.aiMetadata.fitScore === 'High' ? 'bg-emerald-100 text-emerald-800' :
                        selectedQuery.aiMetadata.fitScore === 'Medium' ? 'bg-amber-100 text-amber-800' :
                        'bg-stone-100 text-stone-700'
                      }`}>
                        {selectedQuery.aiMetadata.fitScore}
                      </span>
                    </div>
                    <p className="text-sm text-stone-700 italic border-l-2 border-stone-300 pl-3 py-1">
                      "{selectedQuery.aiMetadata.fitReason}"
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-stone-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-indigo-600 rounded-full" 
                          style={{ width: `${selectedQuery.aiMetadata.confidence}%` }}
                        ></div>
                      </div>
                      <span className="text-[10px] text-stone-500 font-medium">{selectedQuery.aiMetadata.confidence}% confidence</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Original Email Content */}
              <div className="bg-white border border-stone-200 rounded-2xl p-8 shadow-sm">
                <div className="mb-6 pb-6 border-b border-stone-100">
                  <h1 className="text-2xl font-serif text-stone-900 mb-2">{selectedQuery.emailSubject}</h1>
                  <div className="flex items-center gap-3 text-sm text-stone-500">
                    <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-indigo-900 font-medium border border-stone-200">
                      {selectedQuery.authorName.charAt(0)}
                    </div>
                    <div>
                      <span className="text-stone-900 font-medium block">{selectedQuery.authorName}</span>
                      <span>{new Date(selectedQuery.dateReceived).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                
                <div className="prose prose-stone max-w-none">
                  <p className="whitespace-pre-wrap text-stone-800 leading-relaxed font-serif text-lg">
                    {selectedQuery.emailBody}
                  </p>
                </div>
              </div>

            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-stone-400">
            <svg className="w-16 h-16 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <p className="font-serif">Select a query to review</p>
          </div>
        )}
      </div>
    </div>
  );
}

