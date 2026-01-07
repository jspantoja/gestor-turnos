import React, { useState, useEffect, useRef } from 'react';
import { Clock, ChevronDown, ChevronUp } from 'lucide-react';

const TimeSelector = ({ value, onChange, label }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    // Parse initial value (HH:mm)
    const [hours, minutes] = value ? value.split(':') : ['06', '00'];

    const handleHourChange = (newHour) => {
        const h = newHour.toString().padStart(2, '0');
        onChange(`${h}:${minutes}`);
    };

    const handleMinuteChange = (newMinute) => {
        const m = newMinute.toString().padStart(2, '0');
        onChange(`${hours}:${m}`);
    };

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const hoursRange = Array.from({ length: 24 }, (_, i) => i);
    const minutesRange = Array.from({ length: 12 }, (_, i) => i * 5); // 5-minute increments for cleaner UI

    return (
        <div
            className="flex flex-col gap-1"
            ref={containerRef}
            style={{
                position: 'relative',
                zIndex: isOpen ? 10000 : 1,
                width: '100%'
            }}
        >
            {label && <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase px-1">{label}</label>}

            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full glass-input p-2 text-xs font-mono flex items-center justify-between transition-all ${isOpen ? 'border-[var(--accent-solid)] ring-1 ring-[var(--accent-solid)]/20 shadow-md' : 'hover:border-[var(--accent-solid)]'}`}
            >
                <div className="flex items-center gap-1.5">
                    <Clock size={12} className={isOpen ? "text-[var(--accent-solid)] animate-pulse" : "text-[var(--accent-solid)]"} />
                    <span className="text-xs font-bold">{value || '00:00'}</span>
                </div>
                {isOpen ? <ChevronUp size={12} className="text-[var(--accent-solid)]" /> : <ChevronDown size={12} className="opacity-30" />}
            </button>

            {isOpen && (
                <div
                    className="absolute z-[10001] p-2 rounded-xl shadow-2xl border border-[var(--glass-border)] animate-in fade-in zoom-in-95 duration-200"
                    style={{
                        top: '100%',
                        marginTop: '4px',
                        background: 'var(--glass-panel)',
                        backdropFilter: 'blur(25px) saturate(180%) brightness(1.2)',
                        WebkitBackdropFilter: 'blur(25px) saturate(180%) brightness(1.2)',
                        width: '160px',
                        left: '0',
                        transform: 'none'
                    }}
                >
                    <div className="grid grid-cols-2 gap-2 h-28">
                        {/* Hours Column */}
                        <div className="flex flex-col overflow-y-auto no-scrollbar scroll-smooth">
                            <span className="text-[8px] font-black text-[var(--text-tertiary)] uppercase text-center mb-1 sticky top-0 bg-transparent py-0.5 z-10">Hr</span>
                            <div className="flex flex-col gap-0.5">
                                {hoursRange.map(h => {
                                    const hStr = h.toString().padStart(2, '0');
                                    const isActive = hStr === hours;
                                    return (
                                        <button
                                            key={h}
                                            type="button"
                                            onClick={() => handleHourChange(h)}
                                            className={`py-1.5 rounded-lg text-xs font-bold transition-all ${isActive ? 'bg-[var(--accent-solid)] text-white shadow-md scale-105' : 'hover:bg-[var(--accent-solid)]/10 text-[var(--text-secondary)] opacity-50'}`}
                                        >
                                            {hStr}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Minutes Column */}
                        <div className="flex flex-col overflow-y-auto no-scrollbar scroll-smooth border-l border-[var(--glass-border)] pl-1">
                            <span className="text-[8px] font-black text-[var(--text-tertiary)] uppercase text-center mb-1 sticky top-0 bg-transparent py-0.5 z-10">Min</span>
                            <div className="flex flex-col gap-0.5">
                                {minutesRange.map(m => {
                                    const mStr = m.toString().padStart(2, '0');
                                    const isActive = mStr === minutes;
                                    return (
                                        <button
                                            key={m}
                                            type="button"
                                            onClick={() => handleMinuteChange(m)}
                                            className={`py-1.5 rounded-lg text-xs font-bold transition-all ${isActive ? 'bg-[var(--accent-solid)] text-white shadow-md scale-105' : 'hover:bg-[var(--accent-solid)]/10 text-[var(--text-secondary)] opacity-50'}`}
                                        >
                                            {mStr}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() => setIsOpen(false)}
                        className="w-full mt-2 py-1.5 bg-[var(--accent-solid)] text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all hover:brightness-110 shadow-lg shadow-[var(--accent-solid)]/20"
                    >
                        LISTO
                    </button>
                </div>
            )}
        </div>
    );
};

export default TimeSelector;
