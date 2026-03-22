import React from "react";

import { ErrorDisplay } from "@hexalith/ui";

import {
  classifyError,
  getErrorDisplayMessage,
  createModuleErrorEvent,
  emitModuleErrorEvent,
} from "./moduleErrorEvents";

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
    try {
      const event = createModuleErrorEvent(
        this.props.name,
        error,
        info.componentStack ?? undefined,
      );
      emitModuleErrorEvent(event);
    } catch {
      console.error("[ModuleErrorBoundary] Failed to emit error event");
    }
  }

  private handleRetry = (): void => {
    this.setState({ error: null });
  };

  override render(): React.ReactNode {
    if (this.state.error) {
      const classification = classifyError(this.state.error);
      const title = getErrorDisplayMessage(classification, this.props.name);
      return (
        <ErrorDisplay
          error={this.state.error}
          title={title}
          onRetry={this.handleRetry}
        />
      );
    }

    return this.props.children;
  }
}
