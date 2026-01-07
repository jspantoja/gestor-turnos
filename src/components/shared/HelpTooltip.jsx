import React, { useState } from 'react';
import { Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const HelpTooltip = ({ text, size = 14, className = "" }) => {
    const [isVisible, setIsVisible] = useState(false);

    return (
        <div
            className={`relative inline-flex items-center ml-1.5 align-middle ${className}`}
            onMouseEnter={() => setIsVisible(true)}
            onMouseLeave={() => setIsVisible(false)}
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsVisible(!isVisible); // Touch support
            }}
        >
            <Info
                size={size}
                className="text-[var(--text-tertiary)] hover:text-[var(--accent-solid)] transition-colors cursor-help opacity-70 hover:opacity-100"
            />
            <AnimatePresence>
                {isVisible && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 4 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 sm:w-56 p-3 rounded-xl bg-[#1e293b]/95 text-slate-100 text-[11px] font-medium leading-snug shadow-2xl backdrop-blur-md z-[100] border border-white/10 pointer-events-none text-center select-none"
                    >
                        {text}
                        {/* Arrow */}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#1e293b]/95" />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default HelpTooltip;
