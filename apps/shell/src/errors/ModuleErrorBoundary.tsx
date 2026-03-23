import React, { useContext } from "react";

import { ErrorDisplay } from "@hexalith/ui";

import { ErrorMonitoringContext } from "./ErrorMonitoringProvider";
import {
  classifyError,
  getErrorDisplayMessage,
  createModuleErrorEvent,
  emitModuleErrorEvent,
} from "./moduleErrorEvents";

import type {
  ErrorEventContext,
  ModuleErrorEvent,
} from "./moduleErrorEvents";

interface ModuleErrorBoundaryInnerProps {
  name: string;
  children: React.ReactNode;
  errorContext?: ErrorEventContext;
  onEmit?: (event: ModuleErrorEvent) => void;
}

interface ModuleErrorBoundaryState {
  error: Error | null;
}

class ModuleErrorBoundaryInner extends React.Component<
  ModuleErrorBoundaryInnerProps,
  ModuleErrorBoundaryState
> {
  constructor(props: ModuleErrorBoundaryInnerProps) {
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
        this.props.errorContext,
      );
      if (this.props.onEmit) {
        this.props.onEmit(event);
      } else {
        emitModuleErrorEvent(event);
      }
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

export function ModuleErrorBoundary({
  name,
  children,
}: {
  name: string;
  children: React.ReactNode;
}): React.JSX.Element {
  // Raw useContext — returns null if ErrorMonitoringProvider is missing.
  // This is intentional: E2E tests, unit tests, and future shell variants
  // may not include the provider. The inner class falls back to direct
  // emitModuleErrorEvent() when onEmit is undefined.
  const monitoring = useContext(ErrorMonitoringContext);
  return (
    <ModuleErrorBoundaryInner
      name={name}
      errorContext={monitoring?.context}
      onEmit={monitoring?.emit}
    >
      {children}
    </ModuleErrorBoundaryInner>
  );
}
