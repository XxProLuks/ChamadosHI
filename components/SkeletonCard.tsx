import React from 'react';

const SkeletonCard: React.FC = () => (
  <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 animate-pulse">
    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-3" />
    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2 mb-2" />
    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
    <div className="flex gap-2 mt-3">
      <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded-full w-16" />
      <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded-full w-12" />
    </div>
  </div>
);

export default SkeletonCard;
