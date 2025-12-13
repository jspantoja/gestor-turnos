import React from 'react';

const sizes = {
    lg: 'text-3xl',
    md: 'text-2xl',
    sm: 'text-lg'
};

const iconSizes = {
    lg: 28,
    md: 24,
    sm: 18
};

const SectionHeader = ({ children, icon: Icon, className = "", size = "lg", subtitle }) => (
    <div className="flex flex-col items-center">
        <h1 className={`${sizes[size]} font-bold uppercase tracking-widest text-[var(--text-primary)] flex items-center justify-center gap-3 ${className}`}>
            {Icon && <Icon size={iconSizes[size]} />}
            {children}
        </h1>
        {subtitle && (
            <p className="text-sm text-[var(--text-secondary)] mt-1">{subtitle}</p>
        )}
    </div>
);

export default SectionHeader;

