export interface ScrollManager {
  save(routeKey: string): void;
  restore(routeKey: string): void;
  clear(): void;
}

export function createScrollManager(): ScrollManager {
  const positions = new Map<string, number>();

  return {
    save(routeKey: string): void {
      positions.set(routeKey, window.scrollY);
    },
    restore(routeKey: string): void {
      const position = positions.get(routeKey) ?? 0;
      requestAnimationFrame(() => {
        window.scrollTo(0, position);
      });
    },
    clear(): void {
      positions.clear();
    },
  };
}
