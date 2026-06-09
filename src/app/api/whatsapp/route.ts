import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Kredensial WhatsApp di-resolve di server (tidak pernah dikirim dari browser).
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const GATEWAY_MESSAGE = "https://seen.getsender.id/send-message";
const GATEWAY_IMAGE = "https://seen.getsender.id/send-image";

async function getWaConfig() {
  const { data } = await supabase
    .from("settings")
    .select("key, value")
    .in("key", ["wa_api_key", "wa_phone", "wa_sender"]);
  const map: Record<string, string> = {};
  (data || []).forEach((r) => (map[r.key] = r.value));
  return {
    apiKey: map.wa_api_key || "",
    sender: map.wa_sender || map.wa_phone || "",
    defaultNumber: map.wa_phone || "",
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { number, message, type, image, caption } = body;

    const { apiKey, sender, defaultNumber } = await getWaConfig();

    // "default" / kosong => kirim ke nomor admin yang dikonfigurasi server.
    const targetNumber = !number || number === "default" ? defaultNumber : number;

    if (!targetNumber) {
      return NextResponse.json({ success: false, error: "Nomor tujuan kosong" }, { status: 400 });
    }

    if (!apiKey) {
      return NextResponse.json({ success: false, error: "WhatsApp belum dikonfigurasi" }, { status: 400 });
    }

    if (type === "image" && image) {
      const resp = await fetch(GATEWAY_IMAGE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: apiKey, sender, number: targetNumber, image, caption: caption || "" }),
      });
      const text = await resp.text();
      if (!resp.ok) {
        return NextResponse.json({ success: false, error: `HTTP ${resp.status}: ${text}` }, { status: resp.status });
      }
      return NextResponse.json({ success: true, data: text });
    }

    if (!message) {
      return NextResponse.json({ success: false, error: "Pesan kosong" }, { status: 400 });
    }

    const resp = await fetch(GATEWAY_MESSAGE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: apiKey, sender, number: targetNumber, message }),
    });
    const text = await resp.text();
    if (!resp.ok) {
      return NextResponse.json({ success: false, error: `HTTP ${resp.status}: ${text}` }, { status: resp.status });
    }
    return NextResponse.json({ success: true, data: text });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Gagal mengirim" }, { status: 500 });
  }
}
