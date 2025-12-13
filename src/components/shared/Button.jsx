import React from 'react';
import { Loader } from 'lucide-react';

const Button = ({ children, onClick, active, variant = "primary", className = "", loading = false, disabled = false }) => {
    const isDisabled = disabled || loading;
    const base = "px-6 py-3 rounded-full font-semibold text-[14px] tracking-wide transition-all duration-200 flex items-center justify-center gap-2 transform active:scale-[0.97] select-none";
    const variants = {
        primary: active
            ? "bg-[var(--accent-solid)] text-[var(--accent-text)] shadow-lg shadow-[var(--accent-solid)]/30"
            : "bg-transparent text-[var(--text-secondary)] border border-[var(--glass-border)] hover:border-[var(--text-primary)] hover:text-[var(--text-primary)]",
        ghost: "bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
        danger: "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 dark:hover:bg-red-900/30 dark:bg-red-900/10 dark:text-red-300 dark:border-red-900/50"
    };
    const disabledStyles = isDisabled ? "opacity-60 cursor-not-allowed pointer-events-none" : "cursor-pointer";

    return (
        <button
            onClick={isDisabled ? undefined : onClick}
            disabled={isDisabled}
            className={`${base} ${variants[variant]} ${disabledStyles} ${className}`}
        >
            {loading && <Loader className="animate-spin" size={16} />}
            {children}
        </button>
    );
};

export default Button;

