export interface CommandCompletedEvent {
  correlationId: string;
  domain: string;
  aggregateId: string;
  tenant: string;
}

export interface CommandEventBus {
  onCommandCompleted(
    listener: (event: CommandCompletedEvent) => void,
  ): () => void;
  emitCommandCompleted(event: CommandCompletedEvent): void;
}

export function createCommandEventBus(): CommandEventBus {
  const listeners: Array<(event: CommandCompletedEvent) => void> = [];

  return {
    onCommandCompleted(listener) {
      listeners.push(listener);
      return () => {
        const index = listeners.indexOf(listener);
        if (index >= 0) {
          listeners.splice(index, 1);
        }
      };
    },
    emitCommandCompleted(event) {
      for (const listener of [...listeners]) {
        listener(event);
      }
    },
  };
}
