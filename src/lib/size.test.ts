import { describe, expect, it } from "vitest";
import { familyKey, formatSize, packSize, unitPricing } from "./size";

describe("tamanho da embalagem", () => {
  const cases: [string, number, string][] = [
    ["ARROZ TIO JOAO T1 5KG", 5, "kg"],
    ["ARROZ SOLITO 1kg", 1, "kg"],
    ["SABAO PO OMO LAVAGEM PERFEITA 1,6KG", 1.6, "kg"],
    ["CD COLG PRO A 90G OR", 0.09, "kg"],
    ["CREME DENT COLGATE TOTAL 12 90G", 0.09, "kg"],
    ["AGUA MIN CRYSTAL S/GAS 1,5L", 1.5, "L"],
    ["LTE DESN PARMALAT 1L", 1, "L"],
    ["CERV HEINEKEN LT 350ML", 0.35, "L"],
    ["CERV SKOL 12X350ML", 4.2, "L"],
    ["OVOS BRANCOS GRANDES C/12", 12, "un"],
    ["PAPEL HIG NEVE FOLHA DUPLA 12UN", 12, "un"],
    ["PH NEVE FT LV12 PG11", 12, "un"],
    ["TOALHA ECONOBOM 2RL", 2, "un"],
    ["ESPONJA EXTREMA L4P3", 4, "un"],
    ["PANO ABS FLASH C/25", 25, "un"],
  ];
  for (const [name, amount, base] of cases) {
    it(name, () => {
      const size = packSize(name);
      expect(size?.base).toBe(base);
      expect(size?.amount).toBeCloseTo(amount, 6);
    });
  }

  it("ignora o que não é tamanho", () => {
    expect(packSize("MARG QUALY C/S")).toBeUndefined();
    expect(packSize("FILTRO AROMA MAX 103")).toBeUndefined();
    expect(packSize("BANANA PRATA")).toBeUndefined();
    expect(packSize("MARG QUALY 1kg C/S")).toEqual({ amount: 1, base: "kg" });
  });

  it("formata", () => {
    expect(formatSize({ amount: 0.5, base: "kg" })).toBe("500 g");
    expect(formatSize({ amount: 1.6, base: "kg" })).toBe("1,6 kg");
    expect(formatSize({ amount: 0.35, base: "L" })).toBe("350 ml");
    expect(formatSize({ amount: 12, base: "un" })).toBe("12 un");
  });
});

describe("preço por kg / litro / unidade", () => {
  it("usa o tamanho do nome", () => {
    expect(unitPricing("ARROZ TIO JOAO T1 5KG", "UN", 27.9)?.value).toBeCloseTo(5.58);
    expect(unitPricing("AGUA MIN CRYSTAL S/GAS 1,5L", "UN", 2.99)?.value).toBeCloseTo(1.993, 3);
    expect(unitPricing("OVOS BRANCOS GRANDES C/12", "UN", 11.9)).toMatchObject({ base: "un" });
  });

  it("item pesado já é por kg", () => {
    expect(unitPricing("BANANA PRATA", "KG", 6.99)).toEqual({ value: 6.99, base: "kg" });
  });

  it("sem tamanho, não inventa", () => {
    expect(unitPricing("ALFACE CRESPA", "UN", 3.99)).toBeUndefined();
  });
});

describe("tipo do produto", () => {
  it("agrupa marcas e embalagens do mesmo produto", () => {
    expect(familyKey("ARROZ TIO JOAO T1 5KG")).toBe(familyKey("ARROZ SOLITO 1kg"));
    expect(familyKey("FEIJ CAR CAMIL 1kg")).toBe(familyKey("FEIJAO CARIOCA KICALDO 1KG"));
    expect(familyKey("PH NEVE FT LV12 PG11")).toBe(familyKey("PAPEL HIG NEVE FOLHA DUPLA 12UN"));
    expect(familyKey("AZ OLIV SERRA 500ML")).toBe(familyKey("AZEITE GALLO EXTRA VIRGEM 500ML"));
    expect(familyKey("PAPEL TOALHA SNOB 2UN")).not.toBe(familyKey("PAPEL HIG NEVE 12UN"));
  });
});
