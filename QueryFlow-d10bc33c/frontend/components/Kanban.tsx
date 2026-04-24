"use client";

import React from 'react';
import { Query, QueryStatus } from '../lib/mockData';

interface KanbanProps {
  queries: Query[];
  onUpdateQuery: (updatedQuery: Query) => void;
}

const COLUMNS: { id: QueryStatus; label: string; color: string }[] = [
  { id: 'new', label: 'Inbox', color: 'bg-stone-400' },
  { id: 'reviewing', label: 'Reviewing', color: 'bg-indigo-500' },
  { id: 'requested_partial', label: 'Partial MS', color: 'bg-rose-500' },
  { id: 'requested_full', label: 'Full MS', color: 'bg-amber-500' },
  { id: 'offered', label: 'Offered', color: 'bg-emerald-500' },
  { id: 'passed', label: 'Passed', color: 'bg-stone-500' },
];

export default function Kanban({ queries, onUpdateQuery }: KanbanProps) {
  
  // Simple drag and drop simulation (in a real app, use dnd-kit or similar)
  const handleDragStart = (e: React.DragEvent, queryId: string) => {
    e.dataTransfer.setData('queryId', queryId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, status: QueryStatus) => {
    e.preventDefault();
    const queryId = e.dataTransfer.getData('queryId');
    const query = queries.find(q => q.id === queryId);
    if (query && query.status !== status) {
      onUpdateQuery({ ...query, status });
    }
  };

  return (
    <div className="h-full bg-transparent p-6 overflow-x-auto">
      <div className="mb-6 flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-stone-900 mb-1 font-serif">Pipeline</h2>
          <p className="text-stone-500 text-sm">Drag and drop to update manuscript status across the team.</p>
        </div>
        <div className="flex gap-2">
          <div className="flex -space-x-2">
            <div className="w-8 h-8 rounded-full bg-indigo-100 border-2 border-white flex items-center justify-center text-xs text-indigo-800 font-medium z-30">AK</div>
            <div className="w-8 h-8 rounded-full bg-rose-100 border-2 border-white flex items-center justify-center text-xs text-rose-800 font-medium z-20">JB</div>
            <div className="w-8 h-8 rounded-full bg-emerald-100 border-2 border-white flex items-center justify-center text-xs text-emerald-800 font-medium z-10">MR</div>
          </div>
          <button className="px-3 py-1.5 text-sm bg-white border border-stone-200 rounded-md text-stone-700 hover:bg-stone-50 transition-colors shadow-sm">
            Filter
          </button>
        </div>
      </div>

      <div className="flex gap-6 h-[calc(100%-80px)] min-w-max">
        {COLUMNS.map(column => {
          const columnQueries = queries.filter(q => q.status === column.id);
          
          return (
            <div 
              key={column.id}
              className="w-80 flex flex-col bg-stone-100/50 rounded-2xl border border-stone-200 overflow-hidden"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.id)}
            >
              {/* Column Header */}
              <div className="p-4 border-b border-stone-200 flex justify-between items-center bg-stone-100/80">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${column.color}`}></div>
                  <h3 className="font-medium text-stone-800">{column.label}</h3>
                </div>
                <span className="text-xs font-medium text-stone-600 bg-stone-200 px-2 py-0.5 rounded-full">
                  {columnQueries.length}
                </span>
              </div>

              {/* Column Content */}
              <div className="flex-1 p-3 overflow-y-auto space-y-3">
                {columnQueries.map(query => (
                  <div 
                    key={query.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, query.id)}
                    className="bg-white border border-stone-200 rounded-xl p-4 cursor-grab active:cursor-grabbing hover:border-indigo-300 hover:shadow-md transition-all shadow-sm"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-medium text-indigo-700 uppercase tracking-wider">
                        {query.aiMetadata.genre}
                      </span>
                      <span className="text-xs text-stone-400">
                        {new Date(query.dateReceived).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    
                    <h4 className="font-serif text-stone-900 mb-1 leading-tight">{query.bookTitle}</h4>
                    <p className="text-sm text-stone-500 mb-3">{query.authorName}</p>
                    
                    {/* Editor Tracking Snippet (if applicable) */}
                    {query.submissions && query.submissions.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-stone-100">
                        <div className="flex items-center gap-1 text-xs text-stone-500 mb-1">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          <span>{query.submissions.length} Editor(s)</span>
                        </div>
                        {query.submissions[0].followUpDate && (
                          <div className="flex items-center gap-1 text-[10px] text-rose-700">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Follow up: {new Date(query.submissions[0].followUpDate).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

