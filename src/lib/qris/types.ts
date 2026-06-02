export interface TLV {
  tag: string;
  name: string;
  length: number;
  value: string;
  children?: TLV[];
}

export interface ConvertOptions {
  amount: number;
  fee?: {
    type: "fixed" | "percentage";
    value: number;
  };
}
