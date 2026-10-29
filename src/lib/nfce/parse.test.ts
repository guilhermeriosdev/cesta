import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { findInnerDocumentUrl, parseBRNumber, parseNfceHtml, portalErrorMessage } from "./parse";
import { accessKeyFromUrl, infoFromAccessKey, looksLikeNfce, parseQrInput } from "./url";

const fixture = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8");

describe("parseBRNumber", () => {
  it("entende números no formato brasileiro", () => {
    expect(parseBRNumber("1.234,56")).toBe(1234.56);
    expect(parseBRNumber("Qtde.:0,385")).toBe(0.385);
    expect(parseBRNumber("Vl. Unit.:   4,79")).toBe(4.79);
    expect(parseBRNumber("1.0000")).toBe(1);
    expect(parseBRNumber("R$ 27,90")).toBe(27.9);
    expect(parseBRNumber("")).toBeNaN();
  });
});

describe("layout padrão da SEFAZ", () => {
  const nota = parseNfceHtml(fixture("padrao.html"));

  it("lê o mercado", () => {
    expect(nota.store.name).toBe("SUPERMERCADO EXEMPLO LTDA");
    expect(nota.store.cnpj).toBe("12.345.678/0001-90");
    expect(nota.store.address).toBe("RUA DAS FLORES, 123, CENTRO, SAO PAULO, SP");
  });

  it("lê os itens", () => {
    expect(nota.items).toHaveLength(3);
    expect(nota.items[0]).toEqual({
      code: "7898080640017",
      name: "LEITE UHT ITALAC INTEGRAL 1L",
      qty: 12,
      unit: "UN",
      unitPrice: 4.79,
      total: 57.48,
    });
    expect(nota.items[1]).toMatchObject({ name: "BANANA PRATA KG", qty: 1.235, unit: "KG", total: 8.63 });
    expect(nota.items[2]).toMatchObject({ unit: "PCT", unitPrice: 1023.9, total: 1023.9 });
  });

  it("lê totais, data, pagamento e chave", () => {
    expect(nota.subtotal).toBe(1090.01);
    expect(nota.discount).toBe(2);
    expect(nota.total).toBe(1088.01);
    expect(nota.payment).toBe("Cartão de Débito");
    expect(nota.issuedAt).toBe("2026-10-12T18:33:22");
    expect(nota.accessKey).toBe("35261012345678000190650010001234561000000010");
  });
});

describe("layout alternativo (MG)", () => {
  const nota = parseNfceHtml(fixture("mg.html"));

  it("lê itens pelo texto da tabela", () => {
    expect(nota.store.name).toBe("SUPERMERCADO BH LTDA");
    expect(nota.items).toHaveLength(2);
    expect(nota.items[0]).toMatchObject({ name: "ARROZ TIO JOAO T1 5KG", code: "7893500020110", qty: 1, total: 27.9 });
    expect(nota.items[1]).toMatchObject({ name: "TOMATE ITALIANO", qty: 0.854, unit: "KG", total: 6.82 });
    expect(nota.items[1].unitPrice).toBeCloseTo(7.986, 2);
  });

  it("lê data, total e chave", () => {
    expect(nota.issuedAt).toBe("2026-10-05T10:12:44");
    expect(nota.subtotal).toBe(34.72);
    expect(nota.accessKey).toBe("31261098765432000110650020000456781000000027");
  });
});

describe("portal de SP com erro", () => {
  const html = fixture("sp-erro.html");

  it("traz a mensagem do pop-up da SEFAZ em vez de 'sem itens'", () => {
    expect(parseNfceHtml(html).items).toHaveLength(0);
    expect(portalErrorMessage(html)).toBe(
      "Problemas na consulta via QR Code – QR Code inválido. Dígito verificador Chave de Acesso do QR Code inválido",
    );
    expect(portalErrorMessage(fixture("padrao.html"))).toBeUndefined();
  });

  it("não segue redirecionamento de script em páginas grandes", () => {
    const base = new URL("https://www.nfce.fazenda.sp.gov.br/NFCeConsultaPublica/Paginas/ConsultaQRCode.aspx");
    expect(findInnerDocumentUrl(html + " ".repeat(6000), base)).toBeUndefined();
  });
});

describe("URL do QR Code", () => {
  const qr =
    "https://www.nfce.fazenda.sp.gov.br/NFCeConsultaPublica/Paginas/ConsultaQRCode.aspx?p=35261012345678000190650010001234561000000010|2|1|1|ABCDEF0123456789";

  it("aceita só portais .gov.br", () => {
    expect(looksLikeNfce(qr)).toBe(true);
    expect(looksLikeNfce("https://exemplo.com/?p=123")).toBe(false);
    expect(() => parseQrInput("https://gov.br.malicioso.com/?p=1")).toThrow();
    expect(() => parseQrInput("http://www.fazenda.pr.gov.br:8080/nfce/qrcode?p=1")).toThrow();
    expect(parseQrInput(qr).hostname).toBe("www.nfce.fazenda.sp.gov.br");
  });

  it("extrai informações da chave de acesso", () => {
    const key = accessKeyFromUrl(new URL(qr))!;
    expect(key).toBe("35261012345678000190650010001234561000000010");
    expect(infoFromAccessKey(key)).toMatchObject({ uf: "SP", year: 2026, month: 10, cnpj: "12345678000190", number: "123456" });
  });

  it("encontra a nota dentro de iframe", () => {
    const inner = findInnerDocumentUrl(
      '<html><body><iframe src="/Dfe/QrCodeNFce?p=123"></iframe></body></html>',
      new URL("https://dfe-portal.svrs.rs.gov.br/NFCE/NFCE-COM.aspx?p=123"),
    );
    expect(inner?.href).toBe("https://dfe-portal.svrs.rs.gov.br/Dfe/QrCodeNFce?p=123");
  });
});
