import { describe, it, expect } from "vitest";
import {
  formatRupiah,
  formatNumber,
  konversiKeSatuanDasar,
  tampilanStok,
  parseNominalInput,
  clsx,
} from "./utils";

describe("formatRupiah", () => {
  it("memformat angka menjadi rupiah tanpa desimal", () => {
    // \u00a0 = non-breaking space yang dipakai Intl id-ID
    expect(formatRupiah(15000).replace(/\u00a0/g, " ")).toBe("Rp 15.000");
    expect(formatRupiah(0).replace(/\u00a0/g, " ")).toBe("Rp 0");
  });

  it("membulatkan tanpa pecahan", () => {
    expect(formatRupiah(15000.9)).not.toContain(",");
  });
});

describe("formatNumber", () => {
  it("memberi pemisah ribuan", () => {
    expect(formatNumber(1000000)).toBe("1.000.000");
    expect(formatNumber(500)).toBe("500");
  });
});

describe("konversiKeSatuanDasar", () => {
  it("mengalikan jumlah beli dengan isi per pak", () => {
    expect(konversiKeSatuanDasar(2, 25)).toBe(50); // 2 karung x 25 kg
    expect(konversiKeSatuanDasar(1, 1)).toBe(1);
    expect(konversiKeSatuanDasar(0, 25)).toBe(0);
  });
});

describe("tampilanStok", () => {
  it("menampilkan 0 saat stok habis", () => {
    expect(tampilanStok(0, "kg", 25, "karung")).toBe("0 kg");
    expect(tampilanStok(-5, "kg", 25, "karung")).toBe("0 kg");
  });

  it("menampilkan jumlah pak penuh tanpa sisa", () => {
    expect(tampilanStok(50, "kg", 25, "karung")).toBe("2 karung");
  });

  it("menampilkan pak + sisa satuan dasar", () => {
    expect(tampilanStok(60, "kg", 25, "karung")).toBe("2 karung + 10 kg");
  });

  it("menampilkan satuan dasar saja saat kurang dari 1 pak", () => {
    expect(tampilanStok(10, "kg", 25, "karung")).toBe("10 kg");
  });
});

describe("parseNominalInput", () => {
  it("mengambil hanya digit", () => {
    expect(parseNominalInput("Rp 15.000")).toBe(15000);
    expect(parseNominalInput("1,250,000")).toBe(1250000);
  });

  it("mengembalikan 0 untuk input kosong/non-angka", () => {
    expect(parseNominalInput("")).toBe(0);
    expect(parseNominalInput("abc")).toBe(0);
  });
});

describe("clsx", () => {
  it("menggabungkan kelas yang truthy saja", () => {
    expect(clsx("a", false, "b", undefined, null, "c")).toBe("a b c");
    expect(clsx()).toBe("");
  });
});
