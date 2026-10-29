import { normalizeText } from "./normalize";

export type CategoryId =
  | "hortifruti"
  | "carnes"
  | "laticinios"
  | "padaria"
  | "mercearia"
  | "bebidas"
  | "limpeza"
  | "higiene"
  | "pets"
  | "outros";

export const CATEGORIES: Record<CategoryId, { label: string; color: string }> = {
  hortifruti: { label: "Hortifrúti", color: "#34C759" },
  carnes: { label: "Carnes e frios", color: "#FF3B30" },
  laticinios: { label: "Laticínios e ovos", color: "#32ADE6" },
  padaria: { label: "Padaria", color: "#A2845E" },
  mercearia: { label: "Mercearia", color: "#FF9500" },
  bebidas: { label: "Bebidas", color: "#5856D6" },
  limpeza: { label: "Limpeza", color: "#00C7BE" },
  higiene: { label: "Higiene", color: "#FF2D55" },
  pets: { label: "Pets", color: "#FFCC00" },
  outros: { label: "Outros", color: "#8E8E93" },
};

export const CATEGORY_ORDER = Object.keys(CATEGORIES) as CategoryId[];

/**
 * Regras por palavra. `prefix` casa com o começo de qualquer palavra (pega abreviações
 * como "REFRIG"), `exact` só com a palavra inteira. A ordem importa: a primeira que casar vence.
 */
type Rule = { id: CategoryId; prefix?: string[]; exact?: string[] };

const RULES: Rule[] = [
  { id: "pets", prefix: ["RACAO", "PETISCO", "WHISKAS", "PEDIGREE", "FRISKIES", "AREIA SANIT", "AREIA HIG"] },
  {
    id: "limpeza",
    prefix: [
      "DETERG", "SABAO", "LAVA ROUPA", "LAVA LOUCA", "AMACIANTE", "DESINF", "AGUA SANIT", "ALVEJ", "ESPONJA",
      "LIMPADOR", "MULTIUSO", "MULTI USO", "SACO LIXO", "SACO P LIXO", "SACO DE LIXO", "PAPEL TOALHA", "PAP TOALHA",
      "BOMBRIL", "LA DE ACO", "LUSTRA", "INSETIC", "DESENGORD", "TIRA MANCHA", "VANISH", "COMFORT", "DOWNY",
      "ODORIZ", "FLANELA", "VASSOURA",
    ],
    exact: ["DET", "AMAC", "LIMP", "YPE", "OMO", "VEJA", "CLORO", "PANO", "RODO", "BOM AR"],
  },
  {
    id: "higiene",
    prefix: [
      "SHAMP", "CONDICIONADOR", "SABONETE", "SABON", "CREME DENT", "CR DENT", "PASTA DENT", "ESC DENT",
      "ESCOVA DENT", "DESOD", "ANTITRANSP", "PAPEL HIG", "PAP HIG", "ABSORV", "FRALDA", "COTONETE", "FIO DENT",
      "ENXAG", "LISTERINE", "COLGATE", "PROTETOR SOLAR", "HIDRAT", "APAR BARB", "PRESTOBARBA", "GILLETTE",
      "LENCO UMED", "ALGODAO", "REXONA", "NIVEA",
    ],
    exact: ["P HIG", "SAB LIQ"],
  },
  // Itens de mercearia que contêm palavras de outras categorias
  {
    id: "mercearia",
    prefix: [
      "LEITE COND", "LEITE DE COCO", "LEITE COCO", "DOCE DE LEITE", "CREME DE AVELA", "BATATA PALHA",
      "MOLHO DE TOMATE", "MOLHO TOM", "EXTRATO DE TOMATE", "EXTR TOM", "SARDINHA", "ATUM", "MILHO VERDE",
    ],
  },
  {
    id: "bebidas",
    prefix: [
      "REFRIG", "REFRI", "COCA", "GUARANA", "FANTA", "SPRITE", "PEPSI", "SUCO", "NECTAR", "AGUA", "CERV",
      "SKOL", "BRAHMA", "HEINEKEN", "AMSTEL", "BUDWEISER", "STELLA", "CORONA", "ITAIPAVA", "VINHO", "ESPUMANTE",
      "VODKA", "WHISK", "CACHACA", "ENERG", "RED BULL", "MONSTER", "ISOTON", "GATORADE", "H2OH", "KUAT",
      "SCHWEPPES", "TONICA", "KOMBUCHA",
    ],
    exact: ["CHA", "GIN", "SUC", "REFR"],
  },
  {
    id: "carnes",
    prefix: [
      "CARNE", "BOVIN", "FRANGO", "FRANG", "COXA", "SOBRECOXA", "FILE", "PATINHO", "ACEM", "ALCATRA", "PICANHA",
      "MAMINHA", "FRALDINHA", "CONTRA FILE", "CONTRAFILE", "COSTELA", "CUPIM", "MUSCULO", "LAGARTO", "COXAO",
      "MOIDA", "LINGUI", "SALSICHA", "PRESUNTO", "MORTADELA", "SALAME", "PEITO PERU", "BACON", "PEIXE", "TILAPIA",
      "SALMAO", "BACALHAU", "CAMARAO", "HAMBURG", "NUGGETS", "ALMONDEGA", "CHARQUE", "SUIN", "LOMBO", "PERNIL",
      "BISTECA", "TOSCANA", "CALABRESA", "KAFTA", "BLANQUET", "PEITO DE FRANGO", "PEITO FGO",
    ],
    exact: ["FGO", "ASA", "LING", "PRES", "MORT", "SALS"],
  },
  {
    id: "laticinios",
    prefix: [
      "LEITE", "QUEIJO", "MUSSARELA", "MUCARELA", "IOGURTE", "DANONE", "BEBIDA LACTEA", "REQUEIJAO", "MANTEIGA",
      "MARGARINA", "CREME DE LEITE", "CR LEITE", "RICOTA", "COALHADA", "PARMESAO", "PROVOLONE", "GORGONZOLA",
      "CATUPIRY", "PETIT SUISSE", "YAKULT", "ACTIVIA", "OVO",
    ],
    exact: ["LTE", "QJO", "QJ", "IOG", "REQ", "MUSS", "MARG", "MANT", "NATA"],
  },
  {
    id: "hortifruti",
    prefix: [
      "BANANA", "TOMATE", "ALFACE", "CEBOLA", "BATATA", "CENOURA", "LIMAO", "LARANJA", "MAMAO", "MORANGO",
      "ABACATE", "ABOBORA", "ABOBRINHA", "PEPINO", "PIMENTAO", "ALHO", "COUVE", "BROCOLI", "REPOLHO", "MANGA",
      "MELANCIA", "MELAO", "ABACAXI", "RUCULA", "AGRIAO", "ESPINAFRE", "COENTRO", "CHEIRO VERDE", "CEBOLINHA",
      "KIWI", "MANDIOCA", "AIPIM", "INHAME", "CHUCHU", "BETERRABA", "BERINJELA", "GENGIBRE", "QUIABO", "VAGEM",
      "GOIABA", "MARACUJA", "TANGERINA", "MEXERICA", "PONKAN", "AMEIXA", "PESSEGO", "HORTI", "LEGUME", "FRUTA",
      "VERDURA", "COGUMELO",
    ],
    exact: ["MACA", "UVA", "UVAS", "PERA", "SALSA", "FLV"],
  },
  {
    id: "padaria",
    prefix: ["PAO", "PAES", "BISNAG", "BAGUETE", "CROISSANT", "BROA", "BOLO", "TORRADA", "ROSCA", "PANETONE", "SONHO"],
  },
  {
    id: "mercearia",
    prefix: [
      "ARROZ", "FEIJAO", "FEIJ", "MACARRAO", "ESPAGUETE", "PENNE", "LASANHA", "OLEO", "AZEITE", "ACUCAR", "ACUC",
      "CAFE", "FARINHA", "FUBA", "MOLHO", "EXTRATO", "ERVILHA", "SELETA", "AVEIA", "GRANOLA", "BISC", "BOLACHA",
      "WAFER", "CHOC", "ACHOC", "NESCAU", "TODDY", "CEREAL", "SUCRILHOS", "TEMPERO", "CALDO", "SAZON", "VINAGRE",
      "MAIONESE", "MAION", "KETCHUP", "CATCHUP", "MOSTARDA", "POLVILHO", "GELATINA", "PUDIM", "FERMENTO", "AMIDO",
      "MAISENA", "NUTELLA", "GELEIA", "PIPOCA", "SALGADINHO", "CHIPS", "AMENDOIM", "CASTANHA", "CHICLETE",
      "MASSA", "MIOJO", "LAMEN", "NISSIN", "TAPIOCA", "PALMITO", "AZEITONA", "SHOYU", "COCO RALADO", "MILHO",
    ],
    exact: ["SAL", "MEL", "MAC", "FAR", "BALA"],
  },
];

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const COMPILED = RULES.map((r) => ({
  id: r.id,
  prefix: r.prefix?.length ? new RegExp(`(?:^| )(?:${r.prefix.map(escape).join("|")})`) : null,
  exact: r.exact?.length ? new RegExp(`(?:^| )(?:${r.exact.map(escape).join("|")})(?= |$)`) : null,
}));

export function categorize(name: string): CategoryId {
  const text = normalizeText(name);
  for (const rule of COMPILED) {
    if (rule.prefix?.test(text) || rule.exact?.test(text)) return rule.id;
  }
  return "outros";
}
