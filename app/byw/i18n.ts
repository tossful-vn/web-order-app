// BYW i18n strings — Vietnamese constants at the top per session-lessons gotcha.
export type Lang = "en" | "vi";

const VI_page_title = "Tuần của tôi";
const VI_page_sub = "Lên kế hoạch mỗi ngày. Mỗi ngày hiển thị dinh dưỡng so với mục tiêu hàng ngày.";
const VI_week_label = "% mục tiêu hôm nay";
const VI_add_item = "Thêm";
const VI_add_first = "Thêm bowl, đồ uống hoặc món ăn";
const VI_empty_day = "Chưa có gì";
const VI_picker_close = "Đóng";
const VI_picker_my_bowls = "Bowl của tôi";
const VI_picker_drinks = "Đồ uống";
const VI_picker_foods = "Món thêm";
const VI_picker_tossful = "Signature";
const VI_picker_custom = "Tự nhập";
const VI_picker_no_bowls = "Bạn chưa lưu bowl nào. Hãy tạo một bowl trong máy tính trước.";
const VI_picker_open_calc = "Mở máy tính";
const VI_custom_name_label = "Tên món";
const VI_custom_name_ph = "VD: Bánh mì gà";
const VI_custom_kcal_label = "Calo (không bắt buộc)";
const VI_custom_protein_label = "Đạm g (không bắt buộc)";
const VI_custom_fat_label = "Béo g (không bắt buộc)";
const VI_custom_carbs_label = "Tinh bột g (không bắt buộc)";
const VI_custom_fibre_label = "Chất xơ g (không bắt buộc)";
const VI_custom_save = "Thêm vào ngày";
const VI_picker_add_to = "Thêm vào";
const VI_remove = "Xóa";
const VI_days = ["Thứ hai","Thứ ba","Thứ tư","Thứ năm","Thứ sáu","Thứ bảy","Chủ nhật"];
const VI_days_short = ["T2","T3","T4","T5","T6","T7","CN"];
const VI_item_count = (n: number) => n === 1 ? "1 món" : `${n} món`;
const VI_signin_first = "Đăng nhập để lên kế hoạch tuần.";
const VI_must_try = "Phải thử";
const VI_must_try_empty = "Chưa có món nào. Mở Bowl của bạn rồi bấm hình trái tim để đánh dấu Phải thử.";
const VI_must_try_open = "Mở Bowl của tôi";
const VI_picker_saved_bowls = "Bowl đã lưu";
const VI_picker_sub_bowls = "Bowl";
const VI_picker_sub_wraps = "Cuộn";
const VI_picker_sub_sides = "Món thêm";
// Weekly macros summary banner (ported from /plan, TSK-141)
const VI_macros_header = "Macros tuần này";
const VI_avg_label = "Trung bình mỗi ngày";
// DnD strings (backported from closed PR #9, TSK-141)
const VI_drag_handle = "Kéo để di chuyển";
const VI_drawer_title = "Bowl đã lưu";
const VI_drawer_idle = "Chạm một ngày, rồi kéo bowl vào";
const VI_drawer_remove_hint = "Thả vào đây để xóa khỏi ngày";
const VI_drawer_no_saved = "Bạn chưa lưu bowl nào. Mở máy tính để tạo và lưu.";

const EN_days = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const EN_days_short = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

export const BYW_STR = {
  en: {
    page_title: "My week",
    page_sub: "Plan each day. Add bowls and drinks. Each day shows nutrition vs. recommended daily intake.",
    week_label: "% of daily target",
    add_item: "Add",
    add_first: "Add bowl, drink or food",
    empty_day: "Nothing planned yet",
    picker_close: "Close",
    picker_my_bowls: "My bowls",
    picker_drinks: "Drinks",
    picker_foods: "Foods",
    picker_tossful: "Signature",
    picker_custom: "Custom",
    picker_no_bowls: "No saved bowls yet. Build one in the calculator first.",
    picker_open_calc: "Open calculator",
    custom_name_label: "What is it?",
    custom_name_ph: "e.g. Chicken sandwich",
    custom_kcal_label: "Calories (optional)",
    custom_protein_label: "Protein g (optional)",
    custom_fat_label: "Fat g (optional)",
    custom_carbs_label: "Carbs g (optional)",
    custom_fibre_label: "Fibre g (optional)",
    custom_save: "Add to day",
    picker_add_to: "Add to",
    remove: "Remove",
    days: EN_days,
    days_short: EN_days_short,
    item_count: (n: number) => n === 1 ? "1 item" : `${n} items`,
    signin_first: "Sign in to plan your week.",
    must_try: "Must Try",
    must_try_empty: "Nothing here yet. Open Your Bowls and tap the heart to mark a bowl as Must Try.",
    must_try_open: "Open My Bowls",
    picker_saved_bowls: "Saved Bowls",
    picker_sub_bowls: "Bowls",
    picker_sub_wraps: "Wraps",
    picker_sub_sides: "Sides",
    macro_cal: "CAL", macro_protein: "PROTEIN", macro_fat: "FAT", macro_carbs: "CARBS", macro_fiber: "FIBER",
    macros_header: "This week's macros",
    avg_label: "Avg per day",
    banner_protein: "protein", banner_fat: "fat", banner_carb: "carb",
    drag_handle: "Drag to move",
    drawer_title: "Saved bowls",
    drawer_idle: "Tap a day, then drag a bowl in",
    drawer_remove_hint: "Drop here to remove from the day",
    drawer_no_saved: "No saved bowls yet. Open the calculator to build and save.",
    pick_for: (day: string) => `Pick a bowl for ${day}`,
  },
  vi: {
    page_title: VI_page_title,
    page_sub: VI_page_sub,
    week_label: VI_week_label,
    add_item: VI_add_item,
    add_first: VI_add_first,
    empty_day: VI_empty_day,
    picker_close: VI_picker_close,
    picker_my_bowls: VI_picker_my_bowls,
    picker_drinks: VI_picker_drinks,
    picker_foods: VI_picker_foods,
    picker_tossful: VI_picker_tossful,
    picker_custom: VI_picker_custom,
    picker_no_bowls: VI_picker_no_bowls,
    picker_open_calc: VI_picker_open_calc,
    custom_name_label: VI_custom_name_label,
    custom_name_ph: VI_custom_name_ph,
    custom_kcal_label: VI_custom_kcal_label,
    custom_protein_label: VI_custom_protein_label,
    custom_fat_label: VI_custom_fat_label,
    custom_carbs_label: VI_custom_carbs_label,
    custom_fibre_label: VI_custom_fibre_label,
    custom_save: VI_custom_save,
    picker_add_to: VI_picker_add_to,
    remove: VI_remove,
    days: VI_days,
    days_short: VI_days_short,
    item_count: VI_item_count,
    signin_first: VI_signin_first,
    must_try: VI_must_try,
    must_try_empty: VI_must_try_empty,
    must_try_open: VI_must_try_open,
    picker_saved_bowls: VI_picker_saved_bowls,
    picker_sub_bowls: VI_picker_sub_bowls,
    picker_sub_wraps: VI_picker_sub_wraps,
    picker_sub_sides: VI_picker_sub_sides,
    macro_cal: "CAL",
    macro_protein: "ĐẠM",
    macro_fat: "BÉO",
    macro_carbs: "TINH BỘT",
    macro_fiber: "CHẤT XƠ",
    macros_header: VI_macros_header,
    avg_label: VI_avg_label,
    banner_protein: "đạm", banner_fat: "béo", banner_carb: "tinh bột",
    drag_handle: VI_drag_handle,
    drawer_title: VI_drawer_title,
    drawer_idle: VI_drawer_idle,
    drawer_remove_hint: VI_drawer_remove_hint,
    drawer_no_saved: VI_drawer_no_saved,
    pick_for: (day: string) => `Chọn bowl cho ${day}`,
  },
} as const;
// trailing buffer
