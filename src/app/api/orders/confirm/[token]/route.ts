import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const { data: order, error } = await supabase
    .from("orders")
    .select("*")
    .eq("confirm_token", token)
    .single();

  if (error || !order) {
    return NextResponse.json({ error: "Link tidak valid atau pesanan tidak ditemukan" }, { status: 404 });
  }

  if (order.status === "paid" || order.status === "done") {
    return NextResponse.json({ message: "Pesanan sudah dibayar", order });
  }

  if (order.status !== "confirmed") {
    return NextResponse.json({ error: "Pesanan belum dikonfirmasi oleh kasir", order }, { status: 400 });
  }

  const { data: updated, error: updateError } = await supabase
    .from("orders")
    .update({ status: "paid", updated_at: new Date().toISOString() })
    .eq("id", order.id)
    .select()
    .single();

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
  return NextResponse.json({ message: "Pembayaran dikonfirmasi!", order: updated });
}
