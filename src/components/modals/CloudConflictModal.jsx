import React from 'react';
import { CloudUpload, CloudDownload, AlertTriangle, X, ShieldCheck } from 'lucide-react';

const CloudConflictModal = ({ isOpen, onClose, onUpload, onDownload, lastSync }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="glass-panel w-full max-w-md rounded-3xl overflow-hidden animate-in zoom-in-95 duration-200 border border-[var(--glass-border)] shadow-2xl">
                {/* Header */}
                <div className="bg-[var(--accent-solid)] p-6 text-white relative">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-1 rounded-full hover:bg-white/20 transition-colors"
                    >
                        <X size={20} />
                    </button>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-white/20 rounded-xl">
                            <CloudUpload size={24} />
                        </div>
                        <h2 className="text-xl font-bold">Activar Modo Nube</h2>
                    </div>
                    <p className="text-white/80 text-xs leading-relaxed">
                        Has activado la sincronización. Antes de empezar, debemos decidir qué hacer con los datos actuales para evitar duplicados o pérdida de información.
                    </p>
                </div>

                {/* Content */}
                <div className="p-6 bg-[var(--bg-body)]">
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 mb-6 flex gap-3 items-start">
                        <AlertTriangle className="text-amber-500 shrink-0" size={20} />
                        <div>
                            <p className="text-xs font-bold text-amber-600 uppercase mb-1">¡Cuidado!</p>
                            <p className="text-[11px] text-amber-700 leading-relaxed font-medium">
                                Esta acción puede sobrescribir datos. Si no estás seguro, te recomendamos hacer una **Copia de Seguridad manual** primero.
                            </p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {/* Option 1: Upload */}
                        <button
                            onClick={onUpload}
                            className="w-full group p-4 rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-dock)] hover:border-[var(--accent-solid)] hover:bg-[var(--accent-solid)]/5 transition-all text-left"
                        >
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-xl bg-[var(--accent-solid)]/10 text-[var(--accent-solid)] group-hover:scale-110 transition-transform">
                                    <CloudUpload size={24} />
                                </div>
                                <div className="flex-1">
                                    <div className="text-sm font-bold text-[var(--text-primary)]">Subir datos locales</div>
                                    <div className="text-[10px] text-[var(--text-tertiary)]">Usa los turnos de este dispositivo y reemplaza lo que haya en la nube.</div>
                                </div>
                            </div>
                        </button>

                        {/* Option 2: Download */}
                        <button
                            onClick={onDownload}
                            className="w-full group p-4 rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-dock)] hover:border-blue-500 hover:bg-blue-500/5 transition-all text-left"
                        >
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-xl bg-blue-500/10 text-blue-500 group-hover:scale-110 transition-transform">
                                    <CloudDownload size={24} />
                                </div>
                                <div className="flex-1">
                                    <div className="text-sm font-bold text-[var(--text-primary)]">Descargar de la nube</div>
                                    <div className="text-[10px] text-[var(--text-tertiary)]">Borra los datos de este dispositivo y usa los que tienes guardados en la nube.</div>
                                    {lastSync && (
                                        <div className="text-[9px] text-blue-600 font-bold mt-1 uppercase flex items-center gap-1">
                                            <ShieldCheck size={10} /> Copia en nube: {new Date(lastSync).toLocaleString()}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </button>
                    </div>

                    <button
                        onClick={onClose}
                        className="w-full mt-6 py-3 text-xs font-bold text-[var(--text-secondary)] uppercase hover:text-[var(--text-primary)] transition-colors"
                    >
                        Cancelar y seguir en modo local
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CloudConflictModal;
