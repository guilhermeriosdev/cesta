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
 * como "REFRIG"), `exact` só com a palavra inteira e `start` só com o começo do nome.
 * A ordem importa: a primeira que casar vence.
 */
type Rule = { id: CategoryId; start?: string[]; prefix?: string[]; exact?: string[] };

const RULES: Rule[] = [
  { id: "pets", prefix: ["RACAO", "PETISCO", "WHISKAS", "PEDIGREE", "FRISKIES", "AREIA SANIT", "AREIA HIG", "AREIA GATO"] },
  // Itens que contêm palavras de outras categorias e precisam ser decididos antes
  { id: "padaria", start: ["PAO", "PAES"], prefix: ["PAO QJO", "PAO DE QUEIJO", "PAO DE QJO", "PAO QUEIJO"] },
  {
    id: "mercearia",
    prefix: [
      "LEITE COND", "LTE COND", "LT COND", "M LAC", "MIST LAC", "MISTURA LAC", "DOCE DE LEITE", "DOCE LEITE",
      "DOCE LTE", "CREME DE AVELA", "CR AVELA", "LEITE DE COCO", "LEITE COCO", "LTE COCO", "BATATA PALHA",
      "BAT PALHA", "MOLHO DE TOMATE", "MOLHO TOM", "EXTRATO DE TOMATE", "EXTR TOM", "EXT TOM", "SARDINHA",
      "ATUM", "MILHO VERDE", "MIST BOLO", "MIST P BOLO", "MISTURA BOLO", "MISTURA P BOLO", "MIST PARA BOLO",
    ],
  },
  {
    id: "limpeza",
    prefix: [
      "DETERG", "SABAO", "SAB PO", "SAB BARRA", "LAVA ROUPA", "LAVA LOUCA", "AMACIANTE", "DESINF", "AGUA SANIT",
      "ALVEJ", "ESPONJA", "ESFREG", "LIMPADOR", "LIMPA ", "MULTIUSO", "MULTI USO", "SACO LIXO", "SC LIXO",
      "SACO P LIXO", "SACO DE LIXO", "PAPEL TOALHA", "PAP TOALHA", "TOALHA", "BOMBRIL", "LA DE ACO", "PALHA ACO",
      "PALHA DE ACO", "LUSTRA", "INSETIC", "DESENGORD", "TIRA MANCHA", "TIRA LIMO", "VANISH", "COMFORT", "DOWNY",
      "ODORIZ", "FLANELA", "VASSOURA", "SAPOLIO", "QBOA", "CANDURA", "LYSOFORM", "PINHO SOL", "ALCOOL", "LUVA",
      "GUARDANAPO", "PAPEL ALUM", "PAPEL MANTEIGA", "FILME PVC", "SACO FREEZER", "PREND", "SODA CAUST",
    ],
    exact: ["DET", "AMAC", "LIMP", "YPE", "OMO", "VEJA", "CLORO", "PANO", "RODO", "BOM AR", "ESFR"],
  },
  {
    id: "higiene",
    prefix: [
      "SHAMP", "CONDICIONADOR", "SABONETE", "SABON", "CREME DENT", "CR DENT", "PASTA DENT", "ESC DENT",
      "ESCOVA DENT", "DESOD", "ANTITRANSP", "PAPEL HIG", "PAP HIG", "ABSORV", "FRALDA", "COTONETE", "HASTES",
      "FIO DENT", "ENXAG", "LISTERINE", "COLGATE", "COLG", "SENSODYNE", "ORAL B", "CLOSE UP", "SORRISO",
      "PROTETOR SOLAR", "PROT SOLAR", "REPEL", "HIDRAT", "LOCAO", "APAR BARB", "BARBEAR", "PRESTOBARBA",
      "GILLETTE", "LENCO", "ALGODAO", "REXONA", "NIVEA", "DOVE", "SEDA", "PANTENE", "ELSEVE", "TRESEMME",
      "SERUM", "CR PENT", "CREME PENT", "CACHO", "ESMALTE", "ACETONA",
    ],
    exact: ["P HIG", "PH", "SAB LIQ", "SAB", "CD", "AXE", "DEO", "COND"],
  },
  {
    id: "bebidas",
    prefix: [
      "REFRIG", "REFRI", "REFRESCO", "CLIGHT", "COCA", "GUARANA", "GUAR", "FANTA", "SPRITE", "PEPSI",
      "SUCO", "NECTAR", "AGUA", "AG MIN", "CERV", "SKOL", "BRAHMA", "ANTARCTICA", "DEVASSA", "SPATEN", "HEINEKEN",
      "AMSTEL", "BUDWEISER", "STELLA", "CORONA", "ITAIPAVA", "VINHO", "ESPUMANTE", "VODKA", "WHISK", "CACHACA",
      "ENERG", "RED BULL", "MONSTER", "ISOTON", "GATORADE", "H2OH", "KUAT", "SCHWEPP", "TONICA", "KOMBUCHA",
      "LIMONADA", "SODA",
    ],
    exact: ["CHA", "GIN", "SUC", "REFR", "REF", "MATE", "TANG"],
  },
  {
    id: "carnes",
    prefix: [
      "CARNE", "BOVIN", "FRANGO", "FRANG", "COXA", "SOBRECOXA", "FILE", "SASSAMI", "PATINHO", "ACEM", "ALCATRA",
      "PICANHA", "MAMINHA", "FRALDINHA", "CONTRA FILE", "CONTRAFILE", "COSTEL", "CUPIM", "MUSCULO", "LAGARTO",
      "COXAO", "PALETA", "MOIDA", "LINGUI", "SALSICHA", "PRESUNTO", "MORTADELA", "SALAME", "PEITO PERU", "BACON",
      "PEIXE", "TILAP", "SALMAO", "BACALHAU", "CAMARAO", "HAMB", "NUGGETS", "EMPAN", "ALMONDEGA", "CHARQUE",
      "SUIN", "LOMBO", "PERNIL", "BISTECA", "TOSCANA", "CALABRESA", "KAFTA", "BLANQ", "PEITO DE FRANGO",
      "PEITO FGO",
    ],
    exact: ["FGO", "ASA", "LING", "PRES", "MORT", "SALS", "BOV"],
  },
  {
    id: "laticinios",
    prefix: [
      "LEITE", "QUEIJO", "MUSSARELA", "MUCARELA", "IOGURTE", "DANONE", "DANONINHO", "BEBIDA LACTEA", "BEB LAC",
      "REQUEIJAO", "MANTEIGA", "MARGARINA", "CREME DE LEITE", "CREME LEITE", "CR LEITE", "RICOTA", "COALHADA",
      "PARMESAO", "PROVOLONE", "GORGONZOLA", "CATUPIRY", "COALHO", "PETIT SUISSE", "YAKULT", "ACTIVIA", "OVO",
    ],
    exact: ["LTE", "QJO", "QJ", "IOG", "REQ", "MUSS", "MUC", "MARG", "MANT", "NATA", "L PO"],
  },
  {
    id: "hortifruti",
    prefix: [
      "BANANA", "TOMATE", "ALFACE", "CEBOLA", "BATATA", "CENOUR", "LIMAO", "LARANJA", "MAMAO", "MORANGO",
      "ABACATE", "ABOBORA", "ABOBRINHA", "PEPINO", "PIMENTAO", "ALHO", "COUVE", "BROC", "REPOLHO", "MANGA",
      "MELAN", "MELAO", "ABACAXI", "RUCULA", "AGRIAO", "ESPINAFRE", "COENTRO", "CHEIRO VERDE", "CEBOLINHA", "KIWI",
      "MANDIOCA", "AIPIM", "INHAME", "CHUCHU", "BETERRABA", "BERINJELA", "GENGIBRE", "QUIABO", "VAGEM", "GOIABA",
      "MARACUJA", "TANGERINA", "MEXERICA", "PONKAN", "AMEIXA", "PESSEGO", "HORTI", "LEGUME", "FRUTA", "VERDURA",
      "COGUMELO",
    ],
    exact: ["MACA", "UVA", "UVAS", "PERA", "SALSA", "FLV", "BAT", "TOM", "CEB", "BAN"],
  },
  {
    id: "padaria",
    prefix: ["PAO", "PAES", "BISNAG", "BAGUETE", "CROISSANT", "BROA", "BOLO", "TORRADA", "ROSCA", "PANETONE", "SONHO"],
  },
  {
    id: "mercearia",
    prefix: [
      "ARROZ", "FEIJAO", "FEIJ", "MACARRAO", "ESPAGUETE", "SPAG", "PENNE", "LASANHA", "NHOQUE", "OLEO", "AZEITE",
      "AZ OLIV", "OLIVA", "ACUCAR", "ACUC", "ADOC", "CAFE", "CAPUC", "FILTRO", "FARINHA", "TRIGO", "FUBA",
      "FLOCAO", "FLOCOS", "CUSCUZ", "FAROFA", "MOLHO", "EXTRATO", "ERVILHA", "SELETA", "LENTILHA", "GRAO DE BICO",
      "AVEIA", "GRANOLA", "BISC", "BOLACHA", "WAFER", "COOKIE", "CREAM CRACKER", "CHOC", "ACHOC", "BOMBOM",
      "NESCAU", "TODDY", "CEREAL", "SUCRILHOS", "TEMPERO", "CALDO", "SAZON", "VINAGRE", "MAIONESE", "MAION",
      "KETCHUP", "CATCHUP", "MOSTARDA", "POLVILHO", "GELATINA", "PUDIM", "FERMENTO", "AMIDO", "MAISENA",
      "NUTELLA", "GELEIA", "DOCE", "PIPOCA", "SALG", "CHIPS", "AMEND", "CASTANHA", "CHICLETE", "MASSA", "MIOJO",
      "LAMEN", "NISSIN", "SOPA", "TAPIOCA", "PALMITO", "AZEITONA", "SHOYU", "COCO RALADO", "MILHO",
    ],
    exact: ["SAL", "MEL", "MAC", "FAR", "BALA", "MB", "EXT", "PALHA", "F T", "MOST", "TEMP"],
  },
];

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const COMPILED = RULES.map((r) => ({
  id: r.id,
  start: r.start?.length ? new RegExp(`^(?:${r.start.map(escape).join("|")})`) : null,
  prefix: r.prefix?.length ? new RegExp(`(?:^| )(?:${r.prefix.map(escape).join("|")})`) : null,
  exact: r.exact?.length ? new RegExp(`(?:^| )(?:${r.exact.map(escape).join("|")})(?= |$)`) : null,
}));

export function categorize(name: string): CategoryId {
  const text = normalizeText(name);
  for (const rule of COMPILED) {
    if (rule.start?.test(text) || rule.prefix?.test(text) || rule.exact?.test(text)) return rule.id;
  }
  return "outros";
}
