import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { api_key, sender, number, message, footer } = body;

    if (!api_key || !number || !message) {
      return NextResponse.json({ success: false, error: "Parameter tidak lengkap" }, { status: 400 });
    }

    const resp = await fetch("https://seen.getsender.id/send-message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key, sender, number, message, footer }),
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
