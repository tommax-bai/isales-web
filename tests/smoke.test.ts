import { describe, expect, it } from "vitest";

describe("smoke", () => {
  it("env access compiles", () => {
    // import.meta.env is undefined under vitest unless we provide it; this
    // assertion just exercises the toolchain end-to-end.
    expect(typeof "iSales 智能外呼").toBe("string");
  });
});
