import React from 'react';

// Individual skeleton element with shimmer animation
const SkeletonPulse = ({ className = '' }) => (
    <div className={`skeleton-pulse ${className}`} />
);

// Card skeleton (for worker cards, day cards, etc)
export const SkeletonCard = ({ lines = 2 }) => (
    <div className="glass-panel p-4 rounded-xl animate-pulse">
        <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-[var(--glass-border)]" />
            <div className="flex-1">
                <div className="h-4 w-24 bg-[var(--glass-border)] rounded mb-2" />
                <div className="h-3 w-16 bg-[var(--glass-border)] rounded opacity-60" />
            </div>
        </div>
        {Array.from({ length: lines }).map((_, i) => (
            <div
                key={i}
                className="h-3 bg-[var(--glass-border)] rounded mb-2 opacity-40"
                style={{ width: `${80 - i * 15}%` }}
            />
        ))}
    </div>
);

// Table row skeleton
export const SkeletonTableRow = ({ cols = 5 }) => (
    <div className="flex gap-4 p-3 border-b border-[var(--glass-border)] animate-pulse">
        <div className="w-8 h-8 rounded-full bg-[var(--glass-border)]" />
        {Array.from({ length: cols }).map((_, i) => (
            <div
                key={i}
                className="flex-1 h-4 bg-[var(--glass-border)] rounded"
                style={{ opacity: 1 - i * 0.15 }}
            />
        ))}
    </div>
);

// Full page skeleton (for lazy loaded views)
export const SkeletonPage = () => (
    <div className="flex flex-col h-full animate-enter bg-[var(--bg-body)]">
        {/* Header skeleton */}
        <div className="px-6 py-8 border-b border-[var(--glass-border)]">
            <div className="flex items-center justify-center gap-3 animate-pulse">
                <div className="w-8 h-8 rounded-lg bg-[var(--glass-border)]" />
                <div className="h-6 w-32 bg-[var(--glass-border)] rounded" />
            </div>
        </div>

        {/* Content skeleton */}
        <div className="flex-1 p-6 space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonCard key={i} lines={i % 2 === 0 ? 2 : 3} />
            ))}
        </div>
    </div>
);

// Calendar grid skeleton
export const SkeletonCalendar = () => (
    <div className="grid grid-cols-7 gap-2 p-4 animate-pulse">
        {/* Day headers */}
        {Array.from({ length: 7 }).map((_, i) => (
            <div key={`header-${i}`} className="h-4 bg-[var(--glass-border)] rounded opacity-40" />
        ))}
        {/* Day cells */}
        {Array.from({ length: 35 }).map((_, i) => (
            <div
                key={`cell-${i}`}
                className="aspect-square rounded-xl bg-[var(--glass-border)]"
                style={{ opacity: 0.2 + Math.random() * 0.3 }}
            />
        ))}
    </div>
);

// Inline loading indicator
export const SkeletonInline = ({ width = 'w-20', height = 'h-4' }) => (
    <div className={`${width} ${height} bg-[var(--glass-border)] rounded animate-pulse`} />
);

// Default export with all variants
const Skeleton = {
    Card: SkeletonCard,
    TableRow: SkeletonTableRow,
    Page: SkeletonPage,
    Calendar: SkeletonCalendar,
    Inline: SkeletonInline,
    Pulse: SkeletonPulse
};

export default Skeleton;
