import { describe, it, expect } from "vitest";
import { computeForecast, computeWeeklyForecast, recommendedReorderPoint } from "./forecast";
import { BahanBaku } from "./types";

function makeBahan(overrides: Partial<BahanBaku> = {}): BahanBaku {
  return {
    id: "1",
    nama: "Ayam",
    kategori: "Ayam",
    sat_beli: "karung",
    isi_per_pak: 25,
    sat_dasar: "kg",
    stok: 100,
    stok_goreng: 0,
    reorder_point: 50,
    harga_beli: 250000,
    avg_daily: 10,
    resep_goreng: [],
    created_at: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("computeForecast", () => {
  it("menghitung sisa hari = stok / avg harian (dibulatkan ke bawah)", () => {
    const [item] = computeForecast([makeBahan({ stok: 100, avg_daily: 10 })]);
    expect(item.daysRemaining).toBe(10);
    expect(item.stockNeeded7d).toBe(70);
    expect(item.reorderQty).toBe(0); // 70 - 100 < 0
  });

  it("reorderQty positif saat stok di bawah kebutuhan 7 hari", () => {
    const [item] = computeForecast([makeBahan({ stok: 30, avg_daily: 10 })]);
    expect(item.stockNeeded7d).toBe(70);
    expect(item.reorderQty).toBe(40);
  });

  it("daysRemaining Infinity saat avg harian 0", () => {
    const [item] = computeForecast([makeBahan({ avg_daily: 0 })]);
    expect(item.daysRemaining).toBe(Infinity);
    expect(item.reorderQty).toBe(0);
  });
});

describe("computeWeeklyForecast", () => {
  it("mengabaikan bahan tanpa avg harian", () => {
    const result = computeWeeklyForecast([makeBahan({ avg_daily: 0 })]);
    expect(result).toHaveLength(0);
  });

  it("menandai urgent saat sisa hari <= safety days", () => {
    const now = new Date("2025-01-01T00:00:00Z");
    const [item] = computeWeeklyForecast([makeBahan({ stok: 20, avg_daily: 10 })], 3, now);
    expect(item.daysRemaining).toBe(2);
    expect(item.isUrgent).toBe(true);
  });

  it("menghitung estimasi pembelian dalam satuan beli", () => {
    const now = new Date("2025-01-01T00:00:00Z");
    // stok 0, avg 10, safety 3 => butuh ceil(10*10)=100 kg => 4 karung (25kg) => 4*250000
    const [item] = computeWeeklyForecast([makeBahan({ stok: 0, avg_daily: 10 })], 3, now);
    expect(item.reorderQtyBeli).toBe(4);
    expect(item.estHarga).toBe(1000000);
  });

  it("mengurutkan dari sisa hari paling sedikit", () => {
    const now = new Date("2025-01-01T00:00:00Z");
    const result = computeWeeklyForecast(
      [
        makeBahan({ id: "a", stok: 100, avg_daily: 10 }), // 10 hari
        makeBahan({ id: "b", stok: 20, avg_daily: 10 }), // 2 hari
      ],
      3,
      now
    );
    expect(result.map((r) => r.id)).toEqual(["b", "a"]);
  });

  it("orderByDate = hari ini + (sisa hari - safety days)", () => {
    const now = new Date("2025-01-01T00:00:00Z");
    const [item] = computeWeeklyForecast([makeBahan({ stok: 100, avg_daily: 10 })], 3, now);
    // 10 - 3 = 7 hari dari now => 8 Jan
    expect(item.orderByDate.toISOString().slice(0, 10)).toBe("2025-01-08");
  });
});

describe("recommendedReorderPoint", () => {
  it("= ceil(avg harian * safety days)", () => {
    expect(recommendedReorderPoint(10, 3)).toBe(30);
    expect(recommendedReorderPoint(7.5, 2)).toBe(15);
    expect(recommendedReorderPoint(0, 3)).toBe(0);
  });
});
