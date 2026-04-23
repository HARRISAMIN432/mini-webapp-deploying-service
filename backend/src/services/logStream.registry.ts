/**
 * LogStreamRegistry
 *
 * Manages SSE connections for real-time log streaming.
 *
 * Key design:
 * - Keys are arbitrary strings. Callers use `userId` for global streams or
 *   `userId:deploymentId` for deployment-scoped streams.
 * - The logger.service calls `emitToDeployment(deploymentId, ownerId, …)` which
 *   fires on the scoped key — so only clients watching that specific deployment
 *   receive the event.
 * - No cross-deployment log bleed.
 */

export type SseSender = (event: string, data: unknown) => void;

class LogStreamRegistry {
  private readonly connections = new Map<string, Set<SseSender>>();

  /** Register a sender under `key`. Returns an unregister callback. */
  register(key: string, sender: SseSender): () => void {
    if (!this.connections.has(key)) {
      this.connections.set(key, new Set());
    }
    this.connections.get(key)!.add(sender);

    return () => {
      const senders = this.connections.get(key);
      if (!senders) return;
      senders.delete(sender);
      if (senders.size === 0) this.connections.delete(key);
    };
  }

  /** Emit to all connections under `key`. */
  emit(key: string, event: string, data: unknown): void {
    this.connections.get(key)?.forEach((send) => {
      try {
        send(event, data);
      } catch {
        // Connection may have closed between the check and the write — ignore.
      }
    });
  }

  /**
   * Emit to both the scoped key (`ownerId:deploymentId`) and the legacy
   * global key (`ownerId`) so that any old /logs page connections still work.
   */
  emitToDeployment(
    ownerId: string,
    deploymentId: string,
    event: string,
    data: unknown,
  ): void {
    this.emit(`${ownerId}:${deploymentId}`, event, data);
    // Also fire on the legacy global key for backward-compat
    this.emit(ownerId, event, data);
  }

  broadcast(event: string, data: unknown): void {
    this.connections.forEach((senders) =>
      senders.forEach((send) => {
        try {
          send(event, data);
        } catch {
          /* ignore */
        }
      }),
    );
  }

  connectionCount(key: string): number {
    return this.connections.get(key)?.size ?? 0;
  }
}

export const logStreamRegistry = new LogStreamRegistry();
