// /plan i18n — Vietnamese constants declared up top per the repo's
// session-lessons gotcha (avoid trailing-code truncation). Full VN diacritics
// per BR-86. TSK-118.
export type Lang = "en" | "vi";

const VI_subtitle = "Lên kế hoạch bữa trưa cả tuần";
const VI_week_this = "Tuần này";
const VI_week_prev = "Tuần trước";
const VI_week_next = "Tuần sau";
const VI_macros_header = "Macros tuần này";
const VI_avg_label = "Trung bình mỗi ngày";
const VI_empty_slot = "Chạm để chọn bowl";
const VI_slot_prompt = "Chọn bowl từ “Bowl đã lưu” bên dưới";
const VI_drawer_title = "Bowl đã lưu";
const VI_drawer_idle = "Chạm một ngày, rồi chọn bowl";
const VI_no_saved = "Bạn chưa lưu bowl nào. Mở máy tính để tạo và lưu.";
const VI_open_calc = "Mở máy tính";
const VI_template_start = "Bắt đầu với plan này";
const VI_empty_title = "Plan của bạn còn trống";
const VI_empty_ways = "3 cách bắt đầu:";
const VI_empty_diy = "Hoặc tự tạo plan từ đầu — chọn bowl từ “Bowl đã lưu” bên dưới.";
const VI_quick_start = "Bắt đầu nhanh";
const VI_saving = "Đang lưu...";
const VI_saved = "Đã lưu ✓";
const VI_slot_options = "Tùy chọn";
const VI_slot_remove = "Xóa khỏi ngày";
const VI_slot_replace = "Đổi bowl khác";
const VI_continue_q = "Tiếp tục tuần trước?";
const VI_continue_do = "Sao chép kế hoạch";
const VI_close = "Đóng";
const VI_per_bowl = "/bowl";
const VI_days_long = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6"];
const VI_days_en = ["Mon", "Tue", "Wed", "Thu", "Fri"];

export const PLAN_STR = {
  en: {
    title: (name: string | null) => (name ? `${name}'s Plan` : "Your Plan"),
    subtitle: "Plan your week of lunches",
    week_this: "This week",
    week_prev: "Previous week",
    week_next: "Next week",
    macros_header: "This week's macros",
    avg_label: "Avg per day",
    empty_slot: "Tap to add a bowl",
    slot_prompt: "Pick from your saved bowls below",
    drawer_title: "Saved bowls",
    drawer_idle: "Tap a day, then pick a bowl",
    no_saved: "No saved bowls yet. Open the calculator to build and save.",
    open_calc: "Open calculator",
    template_start: "Start with this plan",
    empty_title: "Your plan is empty",
    empty_ways: "3 ways to start:",
    empty_diy: "Or build your own from scratch — pick from your saved bowls below.",
    quick_start: "Quick start",
    saving: "Saving...",
    saved: "Saved ✓",
    slot_options: "Options",
    slot_remove: "Remove from day",
    slot_replace: "Replace bowl",
    continue_q: "Continue last week?",
    continue_do: "Copy plan",
    close: "Close",
    per_bowl: "/bowl",
    days_long: VI_days_en,
    days_en: VI_days_en,
    cal: "CAL",
    macro_protein: "protein",
    macro_fat: "fat",
    macro_carb: "carb",
    pick_for: (day: string) => `Pick a bowl for ${day}`,
  },
  vi: {
    title: (name: string | null) => (name ? `Plan của ${name}` : "Plan của bạn"),
    subtitle: VI_subtitle,
    week_this: VI_week_this,
    week_prev: VI_week_prev,
    week_next: VI_week_next,
    macros_header: VI_macros_header,
    avg_label: VI_avg_label,
    empty_slot: VI_empty_slot,
    slot_prompt: VI_slot_prompt,
    drawer_title: VI_drawer_title,
    drawer_idle: VI_drawer_idle,
    no_saved: VI_no_saved,
    open_calc: VI_open_calc,
    template_start: VI_template_start,
    empty_title: VI_empty_title,
    empty_ways: VI_empty_ways,
    empty_diy: VI_empty_diy,
    quick_start: VI_quick_start,
    saving: VI_saving,
    saved: VI_saved,
    slot_options: VI_slot_options,
    slot_remove: VI_slot_remove,
    slot_replace: VI_slot_replace,
    continue_q: VI_continue_q,
    continue_do: VI_continue_do,
    close: VI_close,
    per_bowl: VI_per_bowl,
    days_long: VI_days_long,
    days_en: VI_days_en,
    cal: "CAL",
    macro_protein: "đạm",
    macro_fat: "béo",
    macro_carb: "tinh bột",
    pick_for: (day: string) => `Chọn bowl cho ${day}`,
  },
} as const;
// trailing buffer
