import React, { useState, useEffect } from 'react';
import { Lock, Delete } from 'lucide-react';
import { hapticFeedback } from '../../utils/haptics';

const LockScreen = ({ onUnlock, correctPin }) => {
    const [pin, setPin] = useState('');
    const [error, setError] = useState(false);

    // Fallback PIN if correctPin is undefined or empty
    const actualPin = correctPin || '1234';

    // Debug: Log the expected PIN (remove in production)
    useEffect(() => {
        console.log('🔐 PIN esperado:', actualPin);
    }, [actualPin]);

    const handleNum = (num) => {
        if (pin.length < 4) {
            hapticFeedback('light');
            const newPin = pin + num;
            setPin(newPin);
            if (newPin.length === 4) {
                console.log('🔑 PIN ingresado:', newPin, '| Esperado:', actualPin);
                if (newPin === actualPin) {
                    hapticFeedback('success');
                    onUnlock();
                } else {
                    hapticFeedback('error');
                    setError(true);
                    setTimeout(() => { setPin(''); setError(false); }, 500);
                }
            }
        }
    };

    const handleDelete = () => {
        hapticFeedback('light');
        setPin(prev => prev.slice(0, -1));
    };

    return (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-6 bg-[var(--bg-body)]">
            {/* Animated Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-1/4 -left-1/4 w-[60vw] h-[60vw] rounded-full bg-gradient-to-br from-purple-300/30 to-pink-300/30 blur-3xl animate-pulse" style={{ animationDuration: '8s' }} />
                <div className="absolute -bottom-1/4 -right-1/4 w-[50vw] h-[50vw] rounded-full bg-gradient-to-br from-blue-300/30 to-cyan-300/30 blur-3xl animate-pulse" style={{ animationDuration: '10s' }} />
            </div>

            {/* Glass Card */}
            <div className="relative liquid-glass rounded-3xl p-8 flex flex-col items-center animate-enter">
                {/* Icon */}
                <div className="mb-6 w-20 h-20 rounded-2xl bg-[var(--accent-solid)] flex items-center justify-center shadow-lg">
                    <Lock size={36} className="text-white" />
                </div>

                {/* Title */}
                <h2 className="text-2xl font-black text-[var(--text-primary)] mb-2">Acceso Requerido</h2>
                <p className="text-sm text-[var(--text-secondary)] mb-8">Ingresa tu PIN de 4 dígitos</p>

                {/* PIN Dots */}
                <div className="flex gap-4 mb-8">
                    {[0, 1, 2, 3].map(i => (
                        <div
                            key={i}
                            className={`w-4 h-4 rounded-full transition-all duration-300 ${i < pin.length
                                ? (error ? 'bg-red-500 scale-125 animate-pulse' : 'bg-[var(--accent-solid)] scale-110')
                                : 'bg-[var(--glass-border)]'
                                }`}
                        />
                    ))}
                </div>

                {/* Number Pad */}
                <div className="grid grid-cols-3 gap-4">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                        <button
                            key={n}
                            onClick={() => handleNum(n.toString())}
                            className="w-16 h-16 rounded-2xl text-2xl font-bold text-[var(--text-primary)] bg-[var(--glass-panel)] border border-[var(--glass-border)] hover:bg-[var(--glass-border)] active:bg-[var(--accent-solid)] active:text-white active:border-transparent transition-all duration-150 shadow-sm"
                        >
                            {n}
                        </button>
                    ))}
                    <div className="w-16 h-16" />
                    <button
                        onClick={() => handleNum('0')}
                        className="w-16 h-16 rounded-2xl text-2xl font-bold text-[var(--text-primary)] bg-[var(--glass-panel)] border border-[var(--glass-border)] hover:bg-[var(--glass-border)] active:bg-[var(--accent-solid)] active:text-white active:border-transparent transition-all duration-150 shadow-sm"
                    >
                        0
                    </button>
                    <button
                        onClick={handleDelete}
                        className="w-16 h-16 rounded-2xl flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--glass-border)] active:text-[var(--text-primary)] transition-all"
                    >
                        <Delete size={24} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LockScreen;
