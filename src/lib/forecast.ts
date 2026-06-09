import { BahanBaku, ForecastItem, WeeklyForecastItem } from "@/lib/types";

// ============================================================
// Logika forecasting murni (tanpa Supabase) agar mudah diuji.
// ============================================================

export function computeForecast(bahanBaku: BahanBaku[]): ForecastItem[] {
  return bahanBaku.map((b) => {
    const avgDaily = b.avg_daily || 0;
    const daysRemaining = avgDaily > 0 ? Math.floor(b.stok / avgDaily) : Infinity;
    const stockNeeded7d = Math.ceil(avgDaily * 7);
    const reorderQty = Math.max(0, stockNeeded7d - b.stok);
    return { ...b, avgDaily, daysRemaining, stockNeeded7d, reorderQty };
  });
}

export function computeWeeklyForecast(
  bahanBaku: BahanBaku[],
  safetyDays: number = 3,
  now: Date = new Date()
): WeeklyForecastItem[] {
  return bahanBaku
    .filter((b) => (b.avg_daily || 0) > 0)
    .map((b) => {
      const avgDaily = b.avg_daily || 0;
      const isiPerPak = b.isi_per_pak || 1;
      const daysRemaining = Math.floor(b.stok / avgDaily);
      const stokBeli = Math.floor(b.stok / isiPerPak);
      const avgDailyBeli = avgDaily / isiPerPak;
      const orderByDate = new Date(now);
      orderByDate.setDate(orderByDate.getDate() + Math.max(0, daysRemaining - safetyDays));
      const stokNeeded = Math.ceil(avgDaily * (7 + safetyDays));
      const reorderQty = Math.max(0, stokNeeded - b.stok);
      const reorderQtyBeli = Math.ceil(reorderQty / isiPerPak);
      const estHarga = reorderQtyBeli * (b.harga_beli || 0);
      const recommendedReorderPoint = Math.ceil(avgDaily * safetyDays);
      const recommendedReorderPointBeli = Math.ceil(recommendedReorderPoint / isiPerPak);
      return {
        id: b.id,
        nama: b.nama,
        kategori: b.kategori,
        sat_beli: b.sat_beli,
        sat_dasar: b.sat_dasar,
        isi_per_pak: isiPerPak,
        harga_beli: b.harga_beli || 0,
        stokBeli,
        avgDailyBeli,
        daysRemaining,
        orderByDate,
        reorderQtyBeli,
        estHarga,
        isUrgent: daysRemaining <= safetyDays,
        recommendedReorderPoint,
        recommendedReorderPointBeli,
      };
    })
    .sort((a, b) => a.daysRemaining - b.daysRemaining);
}

export function recommendedReorderPoint(avgDaily: number, safetyDays: number = 3): number {
  return Math.ceil((avgDaily || 0) * safetyDays);
}
