import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ errorInfo });
    }

    handleReload = () => {
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center h-full w-full p-8 text-center bg-[var(--bg-body)] text-[var(--text-primary)]">
                    <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mb-6 border border-red-500/20">
                        <AlertTriangle size={40} className="text-red-500" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2">Algo salió mal</h2>
                    <p className="text-[var(--text-secondary)] mb-6 max-w-md">
                        Ocurrió un error inesperado en esta sección. Hemos registrado el problema.
                    </p>

                    {process.env.NODE_ENV === 'development' && this.state.error && (
                        <div className="w-full max-w-lg bg-black/30 rounded-lg p-4 mb-6 overflow-auto text-left border border-white/10">
                            <p className="font-mono text-xs text-red-300 mb-2">{this.state.error.toString()}</p>
                            <pre className="font-mono text-[10px] text-white/50 whitespace-pre-wrap">
                                {this.state.errorInfo?.componentStack}
                            </pre>
                        </div>
                    )}

                    <button
                        onClick={this.handleReload}
                        className="flex items-center gap-2 px-6 py-3 bg-[var(--accent-solid)] text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 hover:scale-105 transition-transform"
                    >
                        <RefreshCw size={18} />
                        Recargar Aplicación
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
