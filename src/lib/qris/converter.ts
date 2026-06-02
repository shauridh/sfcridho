import { calculateCRC16 } from "./crc16";
import { parseTLV } from "./parser";
import type { ConvertOptions, TLV } from "./types";

function buildTLVString(elements: TLV[]): string {
  return elements
    .map((el) => {
      const value = el.children ? buildTLVString(el.children) : el.value;
      const length = value.length.toString().padStart(2, "0");
      return `${el.tag}${length}${value}`;
    })
    .join("");
}

function makeTLV(tag: string, value: string, name = ""): TLV {
  return { tag, name, length: value.length, value };
}

export function convertQRIS(qrisString: string, options: ConvertOptions): string {
  const elements = parseTLV(qrisString);
  const result: TLV[] = [];
  let amountInserted = false;
  const managedTags = new Set(["54", "55", "56", "57", "63"]);

  for (const el of elements) {
    if (managedTags.has(el.tag)) continue;
    if (el.tag === "01") {
      result.push(makeTLV("01", "12", "Point of Initiation Method"));
      continue;
    }
    if (el.tag === "58" && !amountInserted) {
      const amountStr = options.amount.toString();
      result.push(makeTLV("54", amountStr, "Transaction Amount"));
      if (options.fee) {
        if (options.fee.type === "fixed") {
          result.push(makeTLV("55", "02", "Tip or Convenience Indicator"));
          result.push(makeTLV("56", options.fee.value.toString(), "Value of Convenience Fee (Fixed)"));
        } else {
          result.push(makeTLV("55", "03", "Tip or Convenience Indicator"));
          result.push(makeTLV("57", options.fee.value.toString(), "Value of Convenience Fee (%)"));
        }
      }
      amountInserted = true;
    }
    result.push(el);
  }

  const withoutCRC = buildTLVString(result);
  const crcInput = withoutCRC + "6304";
  const crc = calculateCRC16(crcInput);
  return crcInput + crc;
}
