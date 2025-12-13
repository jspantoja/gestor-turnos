import React, { useState } from 'react';
import { Mail, Lock, LogIn, UserPlus, AlertCircle, Loader, LayoutGrid } from 'lucide-react';

const LoginView = ({ onLogin, onRegister, isLoading, error }) => {
    const [isRegistering, setIsRegistering] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (isRegistering) {
            onRegister(email, password);
        } else {
            onLogin(email, password);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--bg-body)]">
            {/* Animated Background Blobs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-1/4 -left-1/4 w-[60vw] h-[60vw] rounded-full bg-gradient-to-br from-purple-300/40 to-pink-300/40 blur-3xl animate-pulse" style={{ animationDuration: '8s' }} />
                <div className="absolute -bottom-1/4 -right-1/4 w-[50vw] h-[50vw] rounded-full bg-gradient-to-br from-blue-300/40 to-cyan-300/40 blur-3xl animate-pulse" style={{ animationDuration: '10s', animationDelay: '1s' }} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40vw] h-[40vw] rounded-full bg-gradient-to-br from-orange-200/30 to-yellow-200/30 blur-3xl animate-pulse" style={{ animationDuration: '12s', animationDelay: '2s' }} />
            </div>

            {/* Login Card with Glass Effect */}
            <div className="relative w-full max-w-md liquid-glass rounded-3xl overflow-hidden">
                {/* Content */}
                <div className="relative p-8 flex flex-col gap-6">
                    {/* Logo & Title */}
                    <div className="text-center">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--accent-solid)] shadow-lg">
                            <LayoutGrid className="h-8 w-8 text-white" />
                        </div>
                        <h1 className="text-2xl font-black text-[var(--text-primary)] tracking-tight">
                            Gestor de Turnos
                        </h1>
                        <p className="mt-2 text-sm text-[var(--text-secondary)]">
                            {isRegistering
                                ? 'Crea tu cuenta de administrador'
                                : 'Accede al panel de control'}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-[var(--text-secondary)] ml-1 uppercase tracking-wider">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--text-tertiary)]" />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="glass-input w-full py-3.5 pl-12 pr-4 text-[var(--text-primary)]"
                                    placeholder="admin@ejemplo.com"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-[var(--text-secondary)] ml-1 uppercase tracking-wider">Contraseña</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--text-tertiary)]" />
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="glass-input w-full py-3.5 pl-12 pr-4 text-[var(--text-primary)]"
                                    placeholder="••••••••"
                                    minLength={6}
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="flex items-center gap-2 rounded-xl bg-red-500/10 p-3 text-sm text-red-600 border border-red-500/20">
                                <AlertCircle className="h-4 w-4 shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--accent-solid)] py-4 font-bold text-white shadow-lg transition-all duration-200 hover:scale-[1.02] hover:shadow-xl active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[var(--accent-solid)] focus:ring-offset-2"
                        >
                            {isLoading ? (
                                <Loader className="h-5 w-5 animate-spin" />
                            ) : isRegistering ? (
                                <>
                                    <UserPlus className="h-5 w-5" />
                                    Crear Cuenta
                                </>
                            ) : (
                                <>
                                    <LogIn className="h-5 w-5" />
                                    Iniciar Sesión
                                </>
                            )}
                        </button>
                    </form>

                    <div className="text-center">
                        <button
                            onClick={() => {
                                setIsRegistering(!isRegistering);
                                setEmail('');
                                setPassword('');
                            }}
                            className="text-sm text-[var(--text-secondary)] hover:text-[var(--accent-solid)] transition-colors font-medium"
                        >
                            {isRegistering
                                ? '¿Ya tienes cuenta? Inicia sesión'
                                : '¿No tienes cuenta? Regístrate'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginView;
