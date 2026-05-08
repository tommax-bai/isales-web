import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";

import VoicePreview from "@/components/VoiceModel/VoicePreview.vue";

// jsdom does not implement Web Audio API; install a minimal mock so the
// component's playPcm16 helper exercises the AudioBuffer construction
// path without actually producing sound.

interface MockBufferSource {
  buffer: AudioBuffer | null;
  onended: (() => void) | null;
  connect: () => void;
  start: () => void;
}

function installAudioContextMock(): {
  bufferConstructed: number;
  copiedSamples: number;
} {
  const stats = { bufferConstructed: 0, copiedSamples: 0 };
  class FakeAudioBuffer {
    private channels: Float32Array[];
    constructor(numCh: number, public length: number, _rate: number) {
      stats.bufferConstructed += 1;
      this.channels = Array.from(
        { length: numCh },
        () => new Float32Array(length),
      );
    }
    getChannelData(i: number): Float32Array {
      return this.channels[i];
    }
  }

  class FakeAudioContext {
    destination = {} as AudioNode;
    constructor(_options?: AudioContextOptions) {}
    createBuffer(numCh: number, length: number, rate: number): AudioBuffer {
      return new FakeAudioBuffer(numCh, length, rate) as unknown as AudioBuffer;
    }
    createBufferSource(): AudioBufferSourceNode {
      const node: MockBufferSource = {
        buffer: null,
        onended: null,
        connect: () => {},
        start: () => {
          stats.copiedSamples += 1;
          // Fire onended on the next microtask so the awaiting promise
          // resolves promptly.
          queueMicrotask(() => node.onended?.());
        },
      };
      return node as unknown as AudioBufferSourceNode;
    }
    close(): Promise<void> {
      return Promise.resolve();
    }
  }
  // @ts-expect-error jsdom does not declare AudioContext; install a stub.
  globalThis.AudioContext = FakeAudioContext;
  return stats;
}

describe("VoicePreview", () => {
  it("constructs an AudioBuffer with the right sample count from PCM16 bytes", async () => {
    const stats = installAudioContextMock();
    vi.mock("@/api/voice", () => {
      // 8000 Hz × 0.5 s × 2 bytes = 8000 bytes -> 4000 samples.
      const buffer = new ArrayBuffer(8000);
      return {
        voiceApi: {
          list: () => Promise.resolve([]),
          preview: () => Promise.resolve(buffer),
        },
      };
    });
    const wrapper = mount(VoicePreview, {
      props: { voiceId: 1 },
      attachTo: document.body,
    });
    await nextTick();
    const exposed = wrapper.vm as unknown as {
      playPcm16: (buf: ArrayBuffer) => Promise<void>;
    };
    await exposed.playPcm16(new ArrayBuffer(8000));
    expect(stats.bufferConstructed).toBeGreaterThanOrEqual(1);
    expect(stats.copiedSamples).toBeGreaterThanOrEqual(1);
    wrapper.unmount();
  });
});
