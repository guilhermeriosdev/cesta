import { NextResponse } from "next/server";
import { fetchNfce } from "@/lib/nfce/fetch";
import { NfceError } from "@/lib/nfce/url";

// Portais da SEFAZ costumam bloquear IPs de fora do Brasil: o vercel.json fixa a função em São Paulo (gru1).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(request: Request) {
  let url = "";
  try {
    const body = (await request.json()) as { url?: unknown };
    url = typeof body.url === "string" ? body.url : "";
  } catch {
    return NextResponse.json({ ok: false, code: "bad_request", message: "Requisição inválida." }, { status: 400 });
  }

  try {
    const receipt = await fetchNfce(url);
    return NextResponse.json({ ok: true, receipt });
  } catch (err) {
    const e =
      err instanceof NfceError
        ? err
        : new NfceError("unknown", "Algo deu errado ao ler essa nota. Tente de novo.", 500);
    if (!(err instanceof NfceError)) console.error("[nfce]", err);
    return NextResponse.json({ ok: false, code: e.code, message: e.message }, { status: e.status });
  }
}
