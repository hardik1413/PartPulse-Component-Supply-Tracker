import React from 'react';

interface LoadingSkeletonProps {
  rows?: number;
  type?: 'table' | 'card' | 'search';
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ rows = 5, type = 'table' }) => {
  if (type === 'card') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-xl p-5 h-32">
            <div className="flex justify-between items-center mb-4">
              <div className="h-4 bg-slate-200 rounded w-24"></div>
              <div className="w-8 h-8 bg-slate-200 rounded-lg"></div>
            </div>
            <div className="h-8 bg-slate-200 rounded w-16 mb-2"></div>
            <div className="h-3 bg-slate-100 rounded w-32"></div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'search') {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 flex items-center gap-3">
          <div className="w-5 h-5 rounded-full bg-blue-300 animate-spin"></div>
          <div className="space-y-1">
            <div className="h-4 bg-blue-200 rounded w-48"></div>
            <div className="h-3 bg-blue-100 rounded w-72"></div>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
              <div className="space-y-2">
                <div className="h-4 bg-slate-200 rounded w-40"></div>
                <div className="h-3 bg-slate-100 rounded w-64"></div>
              </div>
              <div className="h-6 bg-slate-200 rounded w-20"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs animate-pulse">
      <div className="h-10 bg-slate-100 border-b border-slate-200"></div>
      <div className="p-4 space-y-4">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center justify-between gap-4 py-2 border-b border-slate-100 last:border-0">
            <div className="h-4 bg-slate-200 rounded w-32"></div>
            <div className="h-4 bg-slate-200 rounded w-24"></div>
            <div className="h-4 bg-slate-100 rounded w-20"></div>
            <div className="h-4 bg-slate-200 rounded w-16"></div>
            <div className="h-4 bg-slate-100 rounded w-28"></div>
          </div>
        ))}
      </div>
    </div>
  );
};
