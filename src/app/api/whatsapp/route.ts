import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { api_key, sender, number, message, type, image, caption } = body;

    if (!api_key || !number) {
      return NextResponse.json({ success: false, error: "Parameter tidak lengkap" }, { status: 400 });
    }

    if (type === "image" && image) {
      const resp = await fetch("https://seen.getsender.id/send-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key, sender, number, image, caption: caption || "" }),
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

    const resp = await fetch("https://seen.getsender.id/send-message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key, sender, number, message }),
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
