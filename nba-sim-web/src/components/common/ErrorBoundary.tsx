import { Component, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

interface ErrorBoundaryProps {
    children: ReactNode
    fallback?: ReactNode
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface ErrorBoundaryState {
    hasError: boolean
    error: Error | null
    errorInfo: React.ErrorInfo | null
}

/**
 * Error Boundary component for graceful error handling.
 * Catches JavaScript errors in child component tree and displays a fallback UI.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props)
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        }
    }

    static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
        return { hasError: true, error }
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
        this.setState({ errorInfo })

        // Log error to console in development
        console.error('ErrorBoundary caught an error:', error, errorInfo)

        // Call optional error handler
        this.props.onError?.(error, errorInfo)
    }

    handleReset = (): void => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
        })
    }

    handleReload = (): void => {
        window.location.reload()
    }

    handleGoHome = (): void => {
        window.location.href = '/'
    }

    render(): ReactNode {
        if (this.state.hasError) {
            // Custom fallback if provided
            if (this.props.fallback) {
                return this.props.fallback
            }

            // Default error UI
            return (
                <div className="min-h-[400px] flex items-center justify-center p-8">
                    <div className="ui-panel max-w-md w-full p-6 text-center">
                        <div className="w-16 h-16 bg-danger/10 border border-danger/25 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertTriangle className="w-8 h-8 text-danger" />
                        </div>

                        <h2 className="text-xl font-medium text-ink mb-2">
                            Something went wrong
                        </h2>

                        <p className="text-muted text-sm leading-7 mb-6">
                            An unexpected error occurred. Please try again or return to the home page.
                        </p>

                        {/* Error details in development */}
                        {import.meta.env.DEV && this.state.error && (
                            <details className="text-left mb-6 bg-canvas border border-line rounded-lg p-3 text-xs">
                                <summary className="text-muted cursor-pointer font-medium">
                                    Error Details
                                </summary>
                                <pre className="mt-2 text-danger overflow-auto max-h-32">
                                    {this.state.error.message}
                                </pre>
                                {this.state.errorInfo && (
                                    <pre className="mt-2 text-muted overflow-auto max-h-32">
                                        {this.state.errorInfo.componentStack}
                                    </pre>
                                )}
                            </details>
                        )}

                        <div className="flex flex-wrap gap-3 justify-center">
                            <button
                                onClick={this.handleReset}
                                className="ui-button ui-button-secondary"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Try Again
                            </button>
                            <button
                                onClick={this.handleGoHome}
                                className="ui-button ui-button-primary"
                            >
                                <Home className="w-4 h-4" />
                                Go Home
                            </button>
                        </div>
                    </div>
                </div>
            )
        }

        return this.props.children
    }
}
