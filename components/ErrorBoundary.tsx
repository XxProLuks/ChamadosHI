import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null
        };
    }

    static getDerivedStateFromError(error: Error): Partial<State> {
        return { hasError: true, error };
    }

    override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        this.setState({ errorInfo });
        // Log error to monitoring service in production
        if (process.env.NODE_ENV === 'production') {
            // Could send to Sentry, LogRocket, etc.
        }
    }

    handleReload = (): void => {
        window.location.reload();
    };

    handleReset = (): void => {
        this.setState({ hasError: false, error: null, errorInfo: null });
    };

    override render(): ReactNode {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
                    <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-3xl shadow-xl p-8 text-center">
                        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
                            <AlertTriangle className="w-8 h-8 text-rose-600 dark:text-rose-400" />
                        </div>

                        <h1 className="text-2xl font-black text-slate-900 dark:text-white mb-2">
                            Algo deu errado
                        </h1>

                        <p className="text-slate-500 dark:text-slate-400 mb-6">
                            Ocorreu um erro inesperado. Por favor, tente recarregar a página.
                        </p>

                        {process.env.NODE_ENV !== 'production' && this.state.error && (
                            <div className="mb-6 p-4 bg-slate-100 dark:bg-slate-700 rounded-xl text-left overflow-auto max-h-40">
                                <p className="text-xs font-mono text-rose-600 dark:text-rose-400">
                                    {this.state.error.toString()}
                                </p>
                            </div>
                        )}

                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={this.handleReset}
                                className="px-6 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                            >
                                Tentar Novamente
                            </button>
                            <button
                                onClick={this.handleReload}
                                className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center gap-2"
                            >
                                <RefreshCw size={18} />
                                Recarregar
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
