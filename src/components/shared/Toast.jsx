import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

// Toast Context
const ToastContext = createContext(null);

// Toast types configuration
const TOAST_TYPES = {
    success: {
        icon: CheckCircle,
        bgClass: 'bg-green-500',
        textClass: 'text-white'
    },
    error: {
        icon: AlertCircle,
        bgClass: 'bg-red-500',
        textClass: 'text-white'
    },
    warning: {
        icon: AlertTriangle,
        bgClass: 'bg-amber-500',
        textClass: 'text-white'
    },
    info: {
        icon: Info,
        bgClass: 'bg-blue-500',
        textClass: 'text-white'
    }
};

// Individual Toast Component
const Toast = ({ id, message, type = 'success', onClose }) => {
    const config = TOAST_TYPES[type] || TOAST_TYPES.success;
    const Icon = config.icon;

    return (
        <div
            className={`
                flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl
                ${config.bgClass} ${config.textClass}
                animate-slideInUp backdrop-blur-xl
                min-w-[280px] max-w-[400px]
            `}
            role="alert"
        >
            <Icon size={20} className="flex-shrink-0" />
            <span className="flex-1 text-sm font-medium">{message}</span>
            <button
                onClick={() => onClose(id)}
                className="flex-shrink-0 p-1 rounded-full hover:bg-white/20 transition-colors"
                aria-label="Cerrar"
            >
                <X size={16} />
            </button>
        </div>
    );
};

// Toast Container
const ToastContainer = ({ toasts, removeToast }) => (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-2 pointer-events-none sm:bottom-8 sm:right-8 sm:left-auto sm:translate-x-0">
        {toasts.map(toast => (
            <div key={toast.id} className="pointer-events-auto">
                <Toast {...toast} onClose={removeToast} />
            </div>
        ))}
    </div>
);

// Toast Provider
export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((message, type = 'success', duration = 3000) => {
        const id = Date.now() + Math.random();
        const newToast = { id, message, type };

        setToasts(prev => [...prev, newToast]);

        // Auto-remove after duration
        if (duration > 0) {
            setTimeout(() => {
                setToasts(prev => prev.filter(t => t.id !== id));
            }, duration);
        }

        return id;
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const toast = {
        success: (message, duration) => addToast(message, 'success', duration),
        error: (message, duration) => addToast(message, 'error', duration),
        warning: (message, duration) => addToast(message, 'warning', duration),
        info: (message, duration) => addToast(message, 'info', duration),
    };

    return (
        <ToastContext.Provider value={toast}>
            {children}
            <ToastContainer toasts={toasts} removeToast={removeToast} />
        </ToastContext.Provider>
    );
};

// Hook to use toast
export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

export default Toast;
