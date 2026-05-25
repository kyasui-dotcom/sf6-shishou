export const CHARACTER_DATA = [
  { key: "Ryu", jp: "リュウ", icon: "/characters/ryu.svg", color: "#2962FF" },
  { key: "Luke", jp: "ルーク", icon: "/characters/luke.svg", color: "#00BFA5" },
  { key: "Ken", jp: "ケン", icon: "/characters/ken.svg", color: "#D50000" },
  { key: "Juri", jp: "ジュリ", icon: "/characters/juri.svg", color: "#AA00FF" },
  { key: "Kimberly", jp: "キンバリー", icon: "/characters/kimberly.svg", color: "#FF6D00" },
  { key: "Guile", jp: "ガイル", icon: "/characters/guile.svg", color: "#558B2F" },
  { key: "Chun-Li", jp: "春麗", icon: "/characters/chun-li.svg", color: "#0288D1" },
  { key: "Jamie", jp: "ジェイミー", icon: "/characters/jamie.svg", color: "#F9A825" },
  { key: "JP", jp: "JP", icon: "/characters/jp.svg", color: "#37474F" },
  { key: "Marisa", jp: "マリーザ", icon: "/characters/marisa.svg", color: "#C62828" },
  { key: "Manon", jp: "マノン", icon: "/characters/manon.svg", color: "#EC407A" },
  { key: "Dee Jay", jp: "ディージェイ", icon: "/characters/dee_jay.svg", color: "#FF8F00" },
  { key: "Cammy", jp: "キャミィ", icon: "/characters/cammy.svg", color: "#1B5E20" },
  { key: "Lily", jp: "リリー", icon: "/characters/lily.svg", color: "#26A69A" },
  { key: "Zangief", jp: "ザンギエフ", icon: "/characters/zangief.svg", color: "#B71C1C" },
  { key: "Dhalsim", jp: "ダルシム", icon: "/characters/dhalsim.svg", color: "#E65100" },
  { key: "Honda", jp: "E.本田", icon: "/characters/honda.svg", color: "#1565C0" },
  { key: "Blanka", jp: "ブランカ", icon: "/characters/blanka.svg", color: "#2E7D32" },
  { key: "Rashid", jp: "ラシード", icon: "/characters/rashid.svg", color: "#00838F" },
  { key: "A.K.I.", jp: "A.K.I.", icon: "/characters/a_k_i_.svg", color: "#6A1B9A" },
  { key: "Ed", jp: "エド", icon: "/characters/ed.svg", color: "#3949AB" },
  { key: "Akuma", jp: "豪鬼", icon: "/characters/akuma.svg", color: "#4A148C" },
  { key: "M. Bison", jp: "ベガ", icon: "/characters/m__bison.svg", color: "#880E4F" },
  { key: "Terry", jp: "テリー", icon: "/characters/terry.svg", color: "#E53935" },
  { key: "Mai", jp: "マイ", icon: "/characters/mai.svg", color: "#D81B60" },
  { key: "Elena", jp: "エレナ", icon: "/characters/elena.svg", color: "#00897B" },
  { key: "C.Viper", jp: "C.ヴァイパー", icon: "/characters/c_viper.svg", color: "#FF5722" },
  { key: "Sagat", jp: "サガット", icon: "/characters/sagat.svg", color: "#795548" },
] as const;

export type CharacterKey = typeof CHARACTER_DATA[number]["key"];

export const CHARACTERS = CHARACTER_DATA.map(c => c.key);

export const CHARACTER_JP_MAP: Record<string, string> = Object.fromEntries(
  CHARACTER_DATA.filter(c => c.key !== c.jp).map(c => [c.key, c.jp])
);

export const CHARACTER_ICON_MAP: Record<string, string> = Object.fromEntries(
  CHARACTER_DATA.map(c => [c.key, c.icon])
);

export function getCharacterDisplayName(key: string, lang?: string): string {
  const jpName = CHARACTER_JP_MAP[key];
  if (lang && lang.startsWith("ja") && jpName) {
    return key + " (" + jpName + ")";
  }
  return key;
}

export const TAGS = [
  "対空ミス",
  "起き攻め",
  "コンボミス",
  "差し合い",
  "画面端",
  "ドライブラッシュ",
  "投げ抜け",
  "確反",
  "ガード崩し",
  "リバサ",
  "立ち回り",
  "その他",
] as const;

// Maps Japanese tag values (stored in DB) to i18n translation keys
export const TAG_KEY_MAP: Record<string, string> = {
  "対空ミス": "tags.antiAir",
  "起き攻め": "tags.okizeme",
  "コンボミス": "tags.comboDrop",
  "差し合い": "tags.footsies",
  "画面端": "tags.corner",
  "ドライブラッシュ": "tags.driveRush",
  "投げ抜け": "tags.throwTech",
  "確反": "tags.punish",
  "ガード崩し": "tags.guardBreak",
  "リバサ": "tags.reversal",
  "立ち回り": "tags.neutral",
  "その他": "tags.other",
};

export const ADMIN_USER_IDS = ["d4f504af-75c0-402b-aa53-9d6cb63216ab"];
