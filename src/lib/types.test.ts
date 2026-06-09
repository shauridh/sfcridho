import { describe, it, expect } from "vitest";
import { getStokStatus } from "./types";

describe("getStokStatus", () => {
  const reorder = 100;

  it("habis saat stok <= 0", () => {
    expect(getStokStatus(0, reorder)).toBe("habis");
    expect(getStokStatus(-5, reorder)).toBe("habis");
  });

  it("kritis saat stok <= 50% reorder point", () => {
    expect(getStokStatus(50, reorder)).toBe("kritis");
    expect(getStokStatus(30, reorder)).toBe("kritis");
  });

  it("rendah saat stok di antara 50% dan reorder point", () => {
    expect(getStokStatus(51, reorder)).toBe("rendah");
    expect(getStokStatus(100, reorder)).toBe("rendah");
  });

  it("aman saat stok di atas reorder point", () => {
    expect(getStokStatus(101, reorder)).toBe("aman");
    expect(getStokStatus(500, reorder)).toBe("aman");
  });

  it("menangani reorder point 0 (hanya habis vs aman)", () => {
    expect(getStokStatus(0, 0)).toBe("habis");
    expect(getStokStatus(1, 0)).toBe("aman");
  });
});
