import { useEffect, useRef, useState, type ReactNode } from "react";

interface ModuleRenderGuardProps {
  moduleName: string;
  children: ReactNode;
}

/**
 * Detects modules that render empty content (null, undefined, or empty fragment)
 * and throws an error that ModuleErrorBoundary catches.
 *
 * MUST be inside React.Suspense — guard checks post-load render, not pre-load suspension.
 */
export function ModuleRenderGuard({
  moduleName,
  children,
}: ModuleRenderGuardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [renderError, setRenderError] = useState<Error | null>(null);

  useEffect(() => {
    // Check if module rendered empty content after mount.
    // 100ms gives ample margin for one full React render cycle plus
    // any useEffect-driven initial state updates, while being fast enough
    // that the user perceives the error boundary appearing almost instantly.
    const timerId = setTimeout(() => {
      if (ref.current?.childNodes.length === 0) {
        setRenderError(
          new Error(
            `Module '${moduleName}' rendered empty content. The module's root component must return a valid React element.`,
          ),
        );
      }
    }, 100);

    return () => clearTimeout(timerId);
  }, [moduleName]);

  if (renderError) {
    throw renderError;
  }

  // display: contents makes the wrapper invisible to the layout engine.
  // Children participate in the parent's layout as if the wrapper doesn't exist.
  // TODO: If modules need intentionally empty renders (e.g., dashboard waiting
  // for user dataset selection), add allowEmptyRender prop passed through from
  // manifest or route builder config.
  return (
    <div ref={ref} style={{ display: "contents" }}>
      {children}
    </div>
  );
}
