import React from "react";

import { ErrorDisplay } from "@hexalith/ui";

interface ModuleErrorBoundaryProps {
  name: string;
  children: React.ReactNode;
}

interface ModuleErrorBoundaryState {
  error: Error | null;
}

export class ModuleErrorBoundary extends React.Component<
  ModuleErrorBoundaryProps,
  ModuleErrorBoundaryState
> {
  constructor(props: ModuleErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): ModuleErrorBoundaryState {
    return { error };
  }

  override componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error(
      `[ModuleErrorBoundary] Module "${this.props.name}" crashed`,
      {
        module: this.props.name,
        error: error.message,
        stack: error.stack,
        componentStack: info.componentStack,
        timestamp: new Date().toISOString(),
      },
    );
  }

  private handleRetry = (): void => {
    this.setState({ error: null });
  };

  override render(): React.ReactNode {
    if (this.state.error) {
      return (
        <ErrorDisplay
          error={this.state.error}
          title={`Unable to load ${this.props.name}`}
          onRetry={this.handleRetry}
        />
      );
    }

    return this.props.children;
  }
}
