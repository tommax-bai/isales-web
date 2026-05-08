import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ReconnectingWsClient } from "@/utils/wsClient";

class FakeSocket {
  static OPEN = 1;
  url: string;
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onmessage: ((m: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  readyState = 0;
  send = vi.fn();
  constructor(url: string) {
    this.url = url;
    sockets.push(this);
  }
  open(): void {
    this.readyState = FakeSocket.OPEN;
    this.onopen?.();
  }
  close(): void {
    this.readyState = 3;
    this.onclose?.();
  }
}

const sockets: FakeSocket[] = [];

beforeEach(() => {
  sockets.length = 0;
  vi.useFakeTimers();
  // @ts-expect-error install fake WebSocket on global scope.
  globalThis.WebSocket = FakeSocket;
  // @ts-expect-error static OPEN reference matches the runtime constant.
  globalThis.WebSocket.OPEN = FakeSocket.OPEN;
});

afterEach(() => {
  vi.useRealTimers();
});

describe("ReconnectingWsClient", () => {
  it("connects, opens, parses messages, and stops cleanly", () => {
    const onMessage = vi.fn();
    const onOpen = vi.fn();
    const onClose = vi.fn();
    const client = new ReconnectingWsClient<{ type: string }>({
      url: "ws://x/?token=abc",
      onMessage,
      onOpen,
      onClose,
      reconnectBackoffsMs: [10, 20],
      heartbeatMs: 1000,
    });
    client.start();
    expect(sockets).toHaveLength(1);
    sockets[0].open();
    expect(onOpen).toHaveBeenCalledOnce();

    sockets[0].onmessage?.({ data: JSON.stringify({ type: "asr_partial" }) });
    expect(onMessage).toHaveBeenCalledWith({ type: "asr_partial" });

    client.stop();
  });

  it("reconnects after close using the provided backoff sequence", () => {
    const onMessage = vi.fn();
    const client = new ReconnectingWsClient({
      url: "ws://x/?token=abc",
      onMessage,
      reconnectBackoffsMs: [50, 100],
      heartbeatMs: 100_000,
    });
    client.start();
    expect(sockets).toHaveLength(1);
    sockets[0].open();
    sockets[0].close();
    vi.advanceTimersByTime(60);
    expect(sockets).toHaveLength(2);
    sockets[1].open();
    sockets[1].close();
    vi.advanceTimersByTime(110);
    expect(sockets).toHaveLength(3);
    client.stop();
  });

  it("warns and skips on invalid JSON payloads but stays open", () => {
    const onMessage = vi.fn();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const client = new ReconnectingWsClient({
      url: "ws://x/?token=abc",
      onMessage,
      reconnectBackoffsMs: [10],
      heartbeatMs: 100_000,
    });
    client.start();
    sockets[0].open();
    sockets[0].onmessage?.({ data: "{not valid" });
    expect(onMessage).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
    client.stop();
  });

  it("emits a heartbeat ping on the configured interval while open", () => {
    const client = new ReconnectingWsClient({
      url: "ws://x/?token=abc",
      onMessage: () => {},
      reconnectBackoffsMs: [10],
      heartbeatMs: 50,
    });
    client.start();
    sockets[0].open();
    vi.advanceTimersByTime(120);
    expect(sockets[0].send).toHaveBeenCalled();
    client.stop();
  });
});
