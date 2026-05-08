/**
 * Minimal reconnecting WebSocket client.
 *
 * Spec: service-communication § API ↔ 前端 WebSocket 代理 — frontend MUST
 * parse the EngineEvent discriminated union; unknown `type` strings are
 * console.warn'd and skipped (never disconnect).
 */

export interface WsClientOptions<TEvent> {
  url: string; // includes ?token=<jwt>
  onMessage: (event: TEvent) => void;
  onOpen?: () => void;
  onClose?: () => void;
  reconnectBackoffsMs?: number[];
  heartbeatMs?: number;
}

const DEFAULT_BACKOFFS_MS = [200, 500, 1000, 2000, 4000];
const DEFAULT_HEARTBEAT_MS = 30_000;

export class ReconnectingWsClient<TEvent> {
  private socket: WebSocket | null = null;
  private closed = false;
  private attempt = 0;
  private heartbeatHandle: ReturnType<typeof setInterval> | null = null;

  constructor(private opts: WsClientOptions<TEvent>) {}

  start(): void {
    this.closed = false;
    this.connect();
  }

  stop(): void {
    this.closed = true;
    this.clearHeartbeat();
    if (this.socket) {
      this.socket.onclose = null;
      this.socket.close();
      this.socket = null;
    }
  }

  private connect(): void {
    const ws = new WebSocket(this.opts.url);
    this.socket = ws;

    ws.onopen = () => {
      this.attempt = 0;
      this.opts.onOpen?.();
      this.startHeartbeat();
    };

    ws.onmessage = (msg) => {
      try {
        const parsed = JSON.parse(msg.data) as TEvent;
        this.opts.onMessage(parsed);
      } catch {
        console.warn("ws:invalid_json", msg.data);
      }
    };

    ws.onclose = () => {
      this.clearHeartbeat();
      this.opts.onClose?.();
      if (this.closed) return;
      this.scheduleReconnect();
    };

    ws.onerror = () => {
      // close handler will follow.
    };
  }

  private scheduleReconnect(): void {
    const backoffs = this.opts.reconnectBackoffsMs ?? DEFAULT_BACKOFFS_MS;
    const delay = backoffs[Math.min(this.attempt, backoffs.length - 1)];
    this.attempt += 1;
    setTimeout(() => {
      if (!this.closed) this.connect();
    }, delay);
  }

  private startHeartbeat(): void {
    this.clearHeartbeat();
    const interval = this.opts.heartbeatMs ?? DEFAULT_HEARTBEAT_MS;
    this.heartbeatHandle = setInterval(() => {
      if (this.socket?.readyState === WebSocket.OPEN) {
        this.socket.send("ping");
      }
    }, interval);
  }

  private clearHeartbeat(): void {
    if (this.heartbeatHandle !== null) {
      clearInterval(this.heartbeatHandle);
      this.heartbeatHandle = null;
    }
  }
}
