import React from 'react';

interface SkeletonProps {
    className?: string;
    variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
    width?: string | number;
    height?: string | number;
    animation?: 'pulse' | 'wave' | 'none';
}

/**
 * Skeleton loading component for improved UX during data loading
 * Supports various shapes and animation styles
 */
export const Skeleton: React.FC<SkeletonProps> = ({
    className = '',
    variant = 'rectangular',
    width,
    height,
    animation = 'pulse'
}) => {
    const baseClasses = 'bg-slate-200 dark:bg-slate-700';

    const variantClasses = {
        text: 'rounded',
        circular: 'rounded-full',
        rectangular: '',
        rounded: 'rounded-2xl'
    };

    const animationClasses = {
        pulse: 'animate-pulse',
        wave: 'animate-shimmer',
        none: ''
    };

    const style: React.CSSProperties = {
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height
    };

    return (
        <div
            className={`${baseClasses} ${variantClasses[variant]} ${animationClasses[animation]} ${className}`}
            style={style}
            role="status"
            aria-label="Carregando..."
        />
    );
};

// Pre-configured skeleton components for common use cases

export const SkeletonCard: React.FC<{ className?: string }> = ({ className = '' }) => (
    <div className={`bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-lg ${className}`}>
        <div className="flex items-center gap-4 mb-4">
            <Skeleton variant="circular" width={40} height={40} />
            <div className="flex-1 space-y-2">
                <Skeleton variant="rounded" height={12} width="60%" />
                <Skeleton variant="rounded" height={10} width="40%" />
            </div>
        </div>
        <Skeleton variant="rounded" height={16} className="mb-3" />
        <Skeleton variant="rounded" height={16} width="80%" className="mb-3" />
        <Skeleton variant="rounded" height={16} width="60%" />
    </div>
);

export const SkeletonTicketCard: React.FC = () => (
    <div className="bg-white dark:bg-slate-800 rounded-[2rem] p-6 shadow-xl border border-slate-100 dark:border-slate-700">
        <div className="flex justify-between items-start mb-4">
            <div className="flex gap-2">
                <Skeleton variant="rounded" width={80} height={24} />
                <Skeleton variant="rounded" width={60} height={24} />
            </div>
            <Skeleton variant="rounded" width={50} height={16} />
        </div>
        <Skeleton variant="rounded" height={24} className="mb-4" />
        <div className="space-y-2 mb-4">
            <Skeleton variant="rounded" height={16} width="70%" />
            <Skeleton variant="rounded" height={16} width="50%" />
        </div>
        <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-2">
                <Skeleton variant="circular" width={32} height={32} />
                <Skeleton variant="rounded" width={80} height={12} />
            </div>
            <Skeleton variant="rounded" width={60} height={16} />
        </div>
    </div>
);

export const SkeletonList: React.FC<{ count?: number; className?: string }> = ({
    count = 3,
    className = ''
}) => (
    <div className={`space-y-4 ${className}`}>
        {Array.from({ length: count }).map((_, i) => (
            <SkeletonCard key={i} />
        ))}
    </div>
);

export const SkeletonTable: React.FC<{ rows?: number; cols?: number }> = ({
    rows = 5,
    cols = 4
}) => (
    <div className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="flex gap-4 p-4 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
            {Array.from({ length: cols }).map((_, i) => (
                <Skeleton key={i} variant="rounded" height={16} className="flex-1" />
            ))}
        </div>
        {/* Rows */}
        {Array.from({ length: rows }).map((_, rowIdx) => (
            <div
                key={rowIdx}
                className="flex gap-4 p-4 border-b border-slate-100 dark:border-slate-700 last:border-0"
            >
                {Array.from({ length: cols }).map((_, colIdx) => (
                    <Skeleton key={colIdx} variant="rounded" height={14} className="flex-1" />
                ))}
            </div>
        ))}
    </div>
);

export default Skeleton;
