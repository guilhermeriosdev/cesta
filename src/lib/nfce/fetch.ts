import type { ParsedReceipt } from "../types";
import { findInnerDocumentUrl, parseNfceHtml, portalErrorMessage, visibleText } from "./parse";
import { NfceError, accessKeyFromUrl, formatCnpj, infoFromAccessKey, isAllowedUrl, parseQrInput } from "./url";

const USER_AGENT =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";

function decode(buffer: ArrayBuffer, contentType: string | null) {
  const head = new TextDecoder("latin1").decode(buffer.slice(0, 2048));
  const charset =
    contentType?.match(/charset=([\w-]+)/i)?.[1] ?? head.match(/<meta[^>]+charset=["']?([\w-]+)/i)?.[1] ?? "utf-8";
  try {
    return new TextDecoder(charset.toLowerCase()).decode(buffer);
  } catch {
    return new TextDecoder("utf-8").decode(buffer);
  }
}

/** fetch que segue redirecionamentos guardando cookies (alguns portais exigem sessão). */
/**
 * O "|" do parâmetro p= vai codificado (%7C), como o próprio portal faz no formulário.
 * Sem isso o firewall da SEFAZ-SP às vezes responde "Request Rejected".
 */
function requestUrl(url: URL) {
  return url.href.replace(/\|/g, "%7C");
}

async function fetchHtml(start: URL, jar: Map<string, string>) {
  let url = start;
  for (let hop = 0; hop < 6; hop++) {
    if (!isAllowedUrl(url)) throw new NfceError("host", "O portal redirecionou para um endereço não permitido.", 502);
    let res: Response;
    try {
      res = await fetch(requestUrl(url), {
        redirect: "manual",
        cache: "no-store",
        signal: AbortSignal.timeout(15_000),
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "pt-BR,pt;q=0.9",
          ...(jar.size ? { Cookie: [...jar].map(([k, v]) => `${k}=${v}`).join("; ") } : {}),
        },
      });
    } catch (err) {
      const timeout = err instanceof Error && err.name === "TimeoutError";
      throw new NfceError(
        "sefaz_offline",
        timeout ? "O portal da SEFAZ demorou demais para responder. Tente de novo em instantes." : "Não consegui falar com o portal da SEFAZ agora.",
        504,
      );
    }
    for (const cookie of res.headers.getSetCookie?.() ?? []) {
      const pair = cookie.split(";")[0];
      const i = pair.indexOf("=");
      if (i > 0) jar.set(pair.slice(0, i).trim(), pair.slice(i + 1).trim());
    }
    const location = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && location) {
      url = new URL(location, url);
      continue;
    }
    if (!res.ok) throw new NfceError("sefaz_http", `O portal da SEFAZ respondeu com erro (${res.status}).`, 502);
    return { html: decode(await res.arrayBuffer(), res.headers.get("content-type")), url };
  }
  throw new NfceError("redirects", "O portal da SEFAZ redirecionou vezes demais.", 502);
}

export async function fetchNfce(input: string): Promise<ParsedReceipt> {
  const qrUrl = parseQrInput(input);
  const jar = new Map<string, string>();

  let { html, url } = await fetchHtml(qrUrl, jar);
  let parsed = parseNfceHtml(html);

  for (let depth = 0; !parsed.items.length && depth < 2; depth++) {
    const inner = findInnerDocumentUrl(html, url);
    if (!inner || !isAllowedUrl(inner) || inner.href === url.href) break;
    ({ html, url } = await fetchHtml(inner, jar));
    parsed = parseNfceHtml(html);
  }

  if (!parsed.items.length) {
    // Deixa rastro nos logs da Vercel para entender portais que ainda não lemos
    console.warn("[nfce] página sem itens", {
      url: `${url.hostname}${url.pathname}`,
      bytes: html.length,
      title: html.match(/<title[^>]*>([^<]*)/i)?.[1]?.trim(),
      text: visibleText(html).slice(0, 400),
    });
    if (/Request Rejected/i.test(html)) {
      throw new NfceError("blocked", "O portal da SEFAZ bloqueou a consulta automática agora. Tente de novo em alguns segundos.", 502);
    }
    const portalMessage = portalErrorMessage(html);
    if (portalMessage) {
      throw new NfceError("sefaz_message", `A SEFAZ respondeu: ${portalMessage}`, 422);
    }
    if (/captcha/i.test(html)) {
      throw new NfceError("captcha", "O portal desse estado pediu uma verificação (captcha) e não deixou ler a nota automaticamente.", 422);
    }
    throw new NfceError(
      "parse",
      "Não encontrei os itens dessa nota. O portal da SEFAZ pode estar instável ou usar um formato que ainda não lemos.",
      422,
    );
  }

  const accessKey = parsed.accessKey ?? accessKeyFromUrl(qrUrl);
  const info = accessKey ? infoFromAccessKey(accessKey) : undefined;
  const itemsSum = parsed.items.reduce((s, i) => s + i.total, 0);
  const subtotal = parsed.subtotal ?? Math.round(itemsSum * 100) / 100;
  const total = parsed.total ?? Math.round((subtotal - parsed.discount) * 100) / 100;
  const fallbackDate = info ? `${info.year}-${String(info.month).padStart(2, "0")}-01T12:00:00` : undefined;

  return {
    accessKey,
    url: qrUrl.toString(),
    uf: info?.uf,
    store: {
      name: parsed.store.name,
      cnpj: parsed.store.cnpj ?? (info ? formatCnpj(info.cnpj) : undefined),
      address: parsed.store.address,
    },
    issuedAt: parsed.issuedAt ?? fallbackDate ?? new Date().toISOString().slice(0, 19),
    items: parsed.items,
    subtotal,
    discount: parsed.discount,
    total,
    payment: parsed.payment,
  };
}
