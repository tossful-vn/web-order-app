// Static mappings from ingredient/signature names to photo filenames + category colors.
// Photos live in /public/nutrition/ — referenced as "/nutrition/<filename>" in <img src>.

export const CATEGORY_ORDER = ["Base", "Topping", "Premium", "Dressing"] as const;
export type Category = (typeof CATEGORY_ORDER)[number];

// Brand-palette background colors for chips that have no photo (icon/initial fallback)
export const CATEGORY_BG: Record<Category, string> = {
  Base: "#0F563D", // kale green
  Topping: "#F68C02", // butternut squash
  Premium: "#7D291A", // roasted almond
  Dressing: "#0F563D", // kale green
};

// Signature bowl name -> flatlay photo filename.
// Includes both Vietnamese-diacritic and ASCII variants so we hit on either.
export const SIG_PHOTO_MAP: Record<string, string> = {
  "Biết Điều": "signature_biet_dieu.png",
  "Biet Dieu": "signature_biet_dieu.png",
  "Dijon Vu": "signature_dijon_vu.png",
  "Fennel Fling": "signature_fennel_fling.png",
  Festo: "signature_festo.png",
  "Kale My Ex, Please!": "signature_kale_my_ex.png",
  "Mi-So-Cool": "signature_misocool.png",
  "Thai Me Up": "signature_thai_me_up.png",
};

// Strip Vietnamese diacritics for lookups so "Biết Điều" matches "Biet Dieu".
function stripDiacritics(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[Đđ]/g, "D");
}

export function lookupSignaturePhoto(name: string): string | undefined {
  if (SIG_PHOTO_MAP[name]) return SIG_PHOTO_MAP[name];
  const ascii = stripDiacritics(name);
  if (SIG_PHOTO_MAP[ascii]) return SIG_PHOTO_MAP[ascii];
  // Wrap variants ("Fennel Fling - Wrap") fall back to the bowl photo
  const withoutWrap = name.replace(/\s*-\s*Wrap\s*$/i, "").trim();
  if (withoutWrap && withoutWrap !== name) {
    if (SIG_PHOTO_MAP[withoutWrap]) return SIG_PHOTO_MAP[withoutWrap];
    const asciiNoWrap = stripDiacritics(withoutWrap);
    if (SIG_PHOTO_MAP[asciiNoWrap]) return SIG_PHOTO_MAP[asciiNoWrap];
  }
  return undefined;
}

// Ingredient English name -> photo filename
export const PHOTO_MAP: Record<string, string> = {
  Arugula: "arugula.png",
  "Baby spinach": "baby_spinach.png",
  "Brown rice trio": "brown_rice_trio.png",
  "Cauliflower rice": "cauliflower_rice.png",
  "Green lettuce": "green_lettuce.png",
  "Pearl Barley": "vietnamese_pearl_barley.png",
  Quinoa: "quinoa.png",
  "Shredded kale": "kales.png",
  Basil: "basil.png",
  "Crispy Shallot": "crispy_shallot.png",
  Cucumbers: "cucumber.png",
  Edamame: "edamame.png",
  "Green lentils": "green_lentils.png",
  "Red cabbage slaw": "red_cabbabe_slaw.png",
  "Roasted almonds": "almond.png",
  "Roasted Beetroots": "beetroot.png",
  "Roasted broccoli": "broccoli.png",
  "Roasted corn": "roasted_corn.png",
  "Roasted roots": "roasted_roots.png",
  "Tamari seeds mix": "tamari_seed_mix.png",
  Tomatoes: "baby_tomatoes.png",
  "Zaatar croutons": "zaatar_crouton.png",
  Avocado: "avocado.png",
  "Chicken breast": "chicken_breast.png",
  "Chicken thighs": "chicken_thigh.png",
  "Feta cheese": "feta_cheese.png",
  "Grilled Mushrooms": "mushroom_mix.png",
  "Organic egg": "boiled_egg.png",
  "Parme-cookie": "parme_cookie.png",
  "Roasted prawn": "roasted_prawns.png",
  "Roasted salmon": "roasted_salmon.png",
  "Roasted tofu": "roasted_sesame_tofu.png",
  "Shaved parmesan": "grated_parmesan.png",
  "Caesar dressing": "yogurt_caesar.png",
  "Cashew dressing": "spicy_cashew.png",
  "Fennel Olive": "fennel_olive.png",
  "Kumquat honey mustard": "kumquat_honey_mustard.png",
  "Miso sesame ginger": "miso_sesame_ginger.png",
  "Pesto vinaigrette": "pesto.png",
};

// Tabler icon name resolver — fallback when no photo exists for the ingredient.
// Returns the class suffix (e.g. "ti-salad") or null to use the initial-letter fallback.
export function ingredientIcon(name: string): string | null {
  const n = name.toLowerCase();
  if (/kale|spinach|arugula|rocket|lettuce|romaine|spring mix|basil|coriander|herbs/.test(n)) return "ti-salad";
  if (/salmon|tilapia|fish/.test(n)) return "ti-fish";
  if (/prawn|shrimp|tom/.test(n)) return "ti-fish";
  if (/chicken/.test(n)) return "ti-meat";
  if (/egg/.test(n)) return "ti-egg";
  if (/tofu/.test(n)) return "ti-cube";
  if (/mushroom/.test(n)) return "ti-mushroom";
  if (/feta|parme|cheese/.test(n)) return "ti-cheese";
  if (/tomato/.test(n)) return "ti-cherry";
  if (/avocado/.test(n)) return "ti-apple";
  if (/corn/.test(n)) return "ti-leaf-2";
  if (/cucumber/.test(n)) return "ti-leaf-2";
  if (/broccoli/.test(n)) return "ti-plant-2";
  if (/cabbage/.test(n)) return "ti-flower";
  if (/beetroot/.test(n)) return "ti-circle";
  if (/carrot/.test(n)) return "ti-carrot";
  if (/roots/.test(n)) return "ti-carrot";
  if (/lentil/.test(n)) return "ti-circle-dot";
  if (/edamame/.test(n)) return "ti-circles";
  if (/quinoa|rice|barley/.test(n)) return "ti-grain";
  if (/almond|cashew|nut/.test(n)) return "ti-circles";
  if (/croutons|bread|crispy|tortilla/.test(n)) return "ti-bread";
  if (/seeds|tamari/.test(n)) return "ti-circles";
  if (/shallot/.test(n)) return "ti-flower";
  if (/sauce|dressing|vinaigrette|miso|salsa/.test(n)) return "ti-droplet";
  return null;
}

// FDA Daily Reference Values for a 2000-cal reference adult diet
export const DAILY = {
  cal:     { daily: 2000, suffix: "" },
  protein: { daily: 50,   suffix: "g" },
  fat:     { daily: 78,   suffix: "g" },
  carbs:   { daily: 275,  suffix: "g" },
  fiber:   { daily: 28,   suffix: "g" },
} as const;

export type MacroKey = keyof typeof DAILY;
