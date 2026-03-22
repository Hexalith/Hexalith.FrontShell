import React from "react";

const shellErrorBoundaryStyles = `
.shell-error-boundary {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background-color: #f8f9fa;
  padding: 1rem;
}

.shell-error-boundary__card {
  max-width: 480px;
  width: 100%;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 2rem;
  text-align: center;
}

.shell-error-boundary__title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 0.75rem;
}

.shell-error-boundary__message {
  font-size: 0.875rem;
  color: #666;
  margin: 0 0 1.5rem;
  line-height: 1.5;
}

.shell-error-boundary__details {
  font-size: 0.75rem;
  color: #c00;
  background-color: #fff5f5;
  padding: 0.75rem;
  border-radius: 4px;
  text-align: left;
  overflow: auto;
  max-height: 200px;
  margin: 0 0 1.5rem;
  white-space: pre-wrap;
  word-break: break-word;
}

.shell-error-boundary__button {
  padding: 0.5rem 1.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: #fff;
  background-color: #0066cc;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}
`;

interface ShellErrorBoundaryProps {
  children: React.ReactNode;
}

interface ShellErrorBoundaryState {
  error: Error | null;
}

export class ShellErrorBoundary extends React.Component<
  ShellErrorBoundaryProps,
  ShellErrorBoundaryState
> {
  constructor(props: ShellErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): ShellErrorBoundaryState {
    return { error };
  }

  override componentDidCatch(error: Error): void {
    try {
      console.error("[ShellError]", {
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      });
    } catch {
      /* silent — getDerivedStateFromError already set state for UI */
    }
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  override render(): React.ReactNode {
    if (this.state.error) {
      const message = this.state.error.message;
      const isDev = process.env.NODE_ENV !== "production";

      return (
        <>
          <style>{shellErrorBoundaryStyles}</style>
          <div className="shell-error-boundary">
            <div className="shell-error-boundary__card">
              <h1 className="shell-error-boundary__title">
              Something went wrong
              </h1>
              <p className="shell-error-boundary__message">
              The application encountered an unexpected error. Your session is
              preserved — click Reload to continue.
              </p>
              {isDev && (
                <pre className="shell-error-boundary__details">
                  {message}
                  {this.state.error.stack && `\n\n${this.state.error.stack}`}
                </pre>
              )}
              <button
                className="shell-error-boundary__button"
                onClick={this.handleReload}
              >
                Reload
              </button>
            </div>
          </div>
        </>
      );
    }

    return this.props.children;
  }
}
