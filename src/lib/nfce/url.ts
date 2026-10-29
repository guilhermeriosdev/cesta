export class NfceError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

const UF_BY_CODE: Record<string, string> = {
  "11": "RO", "12": "AC", "13": "AM", "14": "RR", "15": "PA", "16": "AP", "17": "TO",
  "21": "MA", "22": "PI", "23": "CE", "24": "RN", "25": "PB", "26": "PE", "27": "AL", "28": "SE", "29": "BA",
  "31": "MG", "32": "ES", "33": "RJ", "35": "SP",
  "41": "PR", "42": "SC", "43": "RS",
  "50": "MS", "51": "MT", "52": "GO", "53": "DF",
};

/** Só deixamos o servidor buscar páginas de portais públicos (.gov.br) — evita virar um proxy aberto. */
export function isAllowedUrl(url: URL) {
  return (
    (url.protocol === "https:" || url.protocol === "http:") &&
    (url.port === "" || url.port === "80" || url.port === "443") &&
    /(^|\.)gov\.br$/i.test(url.hostname)
  );
}

/** Texto do QR Code parece ser de uma NFC-e? (checagem rápida no celular, antes de chamar a API) */
export function looksLikeNfce(text: string) {
  return /^(https?:\/\/)?[\w.-]+\.gov\.br(:\d+)?\/\S*\?\S+/i.test(text.trim());
}

export function parseQrInput(input: string): URL {
  let s = input.trim();
  if (!s) throw new NfceError("empty", "Cole o link do QR Code da nota.");
  if (!/^https?:\/\//i.test(s) && /^[\w.-]+\.gov\.br\//i.test(s)) s = `http://${s}`;
  let url: URL;
  try {
    url = new URL(s);
  } catch {
    throw new NfceError("invalid", "Esse QR Code não parece ser de uma nota fiscal (NFC-e).");
  }
  if (!isAllowedUrl(url)) {
    throw new NfceError("host", "Esse link não é de um portal da SEFAZ (.gov.br).");
  }
  return url;
}

export function accessKeyFromUrl(url: URL): string | undefined {
  const p = url.searchParams.get("p") ?? url.searchParams.get("chNFe") ?? "";
  return p.match(/\d{44}/)?.[0] ?? url.toString().match(/\d{44}/)?.[0];
}

/** A chave de 44 dígitos carrega UF, ano/mês de emissão, CNPJ e número da nota. */
export function infoFromAccessKey(key: string) {
  if (!/^\d{44}$/.test(key)) return undefined;
  return {
    uf: UF_BY_CODE[key.slice(0, 2)],
    year: 2000 + Number(key.slice(2, 4)),
    month: Number(key.slice(4, 6)),
    cnpj: key.slice(6, 20),
    model: key.slice(20, 22),
    series: key.slice(22, 25),
    number: String(Number(key.slice(25, 34))),
  };
}

export function formatCnpj(value: string) {
  const d = value.replace(/\D/g, "");
  if (d.length !== 14) return value;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

export function formatAccessKey(key: string) {
  return key.replace(/(\d{4})(?=\d)/g, "$1 ");
}
