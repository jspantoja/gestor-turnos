import React from 'react';
import { Users, Calendar, FileText, Coffee, AlertCircle } from 'lucide-react';

// SVG illustrations for different empty states
const illustrations = {
    workers: (
        <svg viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <circle cx="100" cy="70" r="50" fill="currentColor" opacity="0.1" />
            <circle cx="100" cy="55" r="20" stroke="currentColor" strokeWidth="3" fill="none" opacity="0.4" />
            <path d="M70 95 Q100 115 130 95" stroke="currentColor" strokeWidth="3" fill="none" opacity="0.4" strokeLinecap="round" />
            <circle cx="60" cy="100" r="8" fill="currentColor" opacity="0.2" />
            <circle cx="140" cy="100" r="8" fill="currentColor" opacity="0.2" />
            <path d="M85 130 L115 130" stroke="currentColor" strokeWidth="2" opacity="0.3" strokeLinecap="round" />
            <path d="M75 140 L125 140" stroke="currentColor" strokeWidth="2" opacity="0.2" strokeLinecap="round" />
        </svg>
    ),
    calendar: (
        <svg viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <rect x="40" y="30" width="120" height="100" rx="12" stroke="currentColor" strokeWidth="3" fill="none" opacity="0.3" />
            <path d="M40 55 L160 55" stroke="currentColor" strokeWidth="2" opacity="0.3" />
            <circle cx="70" cy="42" r="3" fill="currentColor" opacity="0.4" />
            <circle cx="130" cy="42" r="3" fill="currentColor" opacity="0.4" />
            {/* Calendar grid */}
            {[0, 1, 2, 3, 4].map((row) =>
                [0, 1, 2, 3, 4, 5, 6].map((col) => (
                    <rect
                        key={`${row}-${col}`}
                        x={50 + col * 15}
                        y={65 + row * 12}
                        width="10"
                        height="8"
                        rx="2"
                        fill="currentColor"
                        opacity={Math.random() > 0.5 ? 0.15 : 0.08}
                    />
                ))
            )}
        </svg>
    ),
    report: (
        <svg viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <rect x="50" y="25" width="100" height="120" rx="8" stroke="currentColor" strokeWidth="3" fill="none" opacity="0.3" />
            <path d="M65 50 L135 50" stroke="currentColor" strokeWidth="8" opacity="0.15" strokeLinecap="round" />
            <path d="M65 70 L120 70" stroke="currentColor" strokeWidth="6" opacity="0.1" strokeLinecap="round" />
            <path d="M65 88 L130 88" stroke="currentColor" strokeWidth="6" opacity="0.1" strokeLinecap="round" />
            <path d="M65 106 L110 106" stroke="currentColor" strokeWidth="6" opacity="0.1" strokeLinecap="round" />
            <path d="M65 124 L125 124" stroke="currentColor" strokeWidth="6" opacity="0.1" strokeLinecap="round" />
        </svg>
    ),
    rest: (
        <svg viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <ellipse cx="100" cy="120" rx="60" ry="15" fill="currentColor" opacity="0.1" />
            <path d="M70 80 Q70 50 100 50 Q130 50 130 80 L130 110 Q130 120 120 120 L80 120 Q70 120 70 110 Z" stroke="currentColor" strokeWidth="3" fill="none" opacity="0.3" />
            <ellipse cx="100" cy="80" rx="30" ry="8" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.2" />
            <path d="M85 45 Q85 30 100 25" stroke="currentColor" strokeWidth="2" opacity="0.3" strokeLinecap="round" />
            <path d="M100 25 Q115 30 115 45" stroke="currentColor" strokeWidth="2" opacity="0.3" strokeLinecap="round" />
        </svg>
    ),
    default: (
        <svg viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <circle cx="100" cy="80" r="50" stroke="currentColor" strokeWidth="3" fill="none" opacity="0.2" />
            <path d="M100 55 L100 90" stroke="currentColor" strokeWidth="4" opacity="0.4" strokeLinecap="round" />
            <circle cx="100" cy="105" r="4" fill="currentColor" opacity="0.4" />
        </svg>
    )
};

const iconMap = {
    workers: Users,
    calendar: Calendar,
    report: FileText,
    rest: Coffee,
    default: AlertCircle
};

const EmptyState = ({
    type = 'default',
    title,
    description,
    action,
    actionLabel,
    compact = false
}) => {
    const Icon = iconMap[type] || iconMap.default;
    const illustration = illustrations[type] || illustrations.default;

    return (
        <div className={`flex flex-col items-center justify-center text-center ${compact ? 'py-8 px-4' : 'py-16 px-6'} animate-enter`}>
            {/* Illustration */}
            <div className={`${compact ? 'w-24 h-20' : 'w-40 h-32'} text-[var(--accent-solid)] mb-4`}>
                {illustration}
            </div>

            {/* Title */}
            <h3 className={`font-bold text-[var(--text-primary)] ${compact ? 'text-base' : 'text-xl'} mb-2`}>
                {title || 'Sin datos'}
            </h3>

            {/* Description */}
            {description && (
                <p className={`text-[var(--text-secondary)] ${compact ? 'text-xs' : 'text-sm'} max-w-xs mb-4`}>
                    {description}
                </p>
            )}

            {/* Action Button */}
            {action && actionLabel && (
                <button
                    onClick={action}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--accent-solid)] text-white font-bold text-sm shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-transform"
                >
                    <Icon size={16} />
                    {actionLabel}
                </button>
            )}
        </div>
    );
};

export default EmptyState;
