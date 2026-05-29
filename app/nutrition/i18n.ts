// i18n string tables for the nutrition calculator.
// Vietnamese strings live at the top as a const, ASCII code below.
// Reason: Google Drive truncation gotcha with multi-byte UTF-8 near file boundaries
// (see [[tossful-phase2-session-lessons]]).

export type Lang = "en" | "vi";

export type StringTable = {
  page_title: string; page_subtitle: string;
  tab_signature: string; tab_byo: string; tab_feedback: string;
  hero_title: string; hero_subtitle: string;
  bowl_label: string;
  macro_cal: string; macro_protein: string; macro_fat: string; macro_carbs: string; macro_fiber: string;
  your_bowl: string; empty_summary: string;
  reset: string; save_bowl: string;
  microcopy: string; save_soon: string;
  bowl_name_label: string;
  bowl_name_placeholder: string;
  bowl_name_hint: string;
  saving: string;
  signature_modified_suffix: string;
  choose_q: string;
  start_sig: string;
  start_sig_desc: string;
  start_byo: string;
  start_byo_desc: string;
  back_to_start: string;
  browse_h: string;
  browse_sub: string;
  start_from_bowl: string; pick_any: string;
  included_label: string; included_hint: string;
  cat_Base: string; cat_Topping: string; cat_Premium: string; cat_Dressing: string; cat_Free: string;
  save_header_named: string; save_header_anon: string;
  save_nutrition_label: string; name_placeholder: string;
  fb_title: string; fb_intro: string;
  fb_q_ease: string; fb_ease_low: string; fb_ease_high: string;
  fb_q_order: string; fb_order_yes: string; fb_order_maybe: string; fb_order_no: string;
  fb_q_confusion: string;
  fb_q_channels: string;
  fb_ch_instore: string; fb_ch_zalo: string; fb_ch_website: string; fb_ch_facebook: string; fb_ch_other: string;
  fb_q_missing: string; fb_q_other: string;
  fb_q_zalo: string; fb_zalo_placeholder: string;
  fb_submit: string; fb_submitting: string;
  fb_required: string; fb_error: string;
  fb_thanks_title: string; fb_thanks_body: string; fb_thanks_again: string;
  fb_context_label: string;
  proteinLbl: string; fatLbl: string; carbsLbl: string; fiberLbl: string;
  signature_mode: string; byo_mode: string;
  mode_label: string; bowl_label_ctx: string; ingredients_label: string;
  macros_label: string; language_label: string; source_label: string;
  empty_alert: string;
  save_tip: string;
};

const EN: StringTable = {
  page_title: "a bowl for everyone",
  page_subtitle: "nutrition calculator",
  tab_signature: "Signature bowls",
  tab_byo: "Build your own",
  tab_feedback: "Feedback",
  hero_title: "Plan your bowl.",
  hero_subtitle: "Toggle ingredients to see live nutrition.",
  bowl_label: "Your bowl",
  macro_cal: "CAL", macro_protein: "PROTEIN", macro_fat: "FAT", macro_carbs: "CARBS", macro_fiber: "FIBER",
  your_bowl: "Your bowl",
  empty_summary: "Toggle ingredients above to start building your bowl.",
  reset: "Reset", save_bowl: "Save bowl",
  microcopy: "All values per serving",
  save_soon: "Save coming soon",
  bowl_name_label: "Bowl name",
  bowl_name_placeholder: "Bowl name",
  bowl_name_hint: "Auto-named from your ingredients — tap to edit",
  saving: "Saving...",
  signature_modified_suffix: "(custom)",
  choose_q: "How would you like to start?",
  start_sig: "Start from a signature",
  start_sig_desc: "Browse Tossful recipes, then customise",
  start_byo: "Build from scratch",
  start_byo_desc: "Pick ingredients one at a time",
  back_to_start: "Back to start",
  browse_h: "Pick a signature",
  browse_sub: "Tap a bowl to load it, then tweak in the next step.",
  start_from_bowl: "Start from this",
  included_label: "Included",
  included_hint: "Part of the wrap — can't be removed.",
  pick_any: "pick any",
  cat_Base: "Base", cat_Topping: "Toppings", cat_Premium: "Premium protein",
  cat_Dressing: "Dressing", cat_Free: "Free extras",
  save_header_named: "Here is your bowl, {name}:",
  save_header_anon: "Here is your bowl:",
  save_nutrition_label: "Nutrition",
  name_placeholder: "Your name (optional)",
  fb_title: "Help us improve Tossful",
  fb_intro: "Your feedback shapes our menu and this calculator. Takes about 1 minute.",
  fb_q_ease: "How easy was this to use?",
  fb_ease_low: "Confusing", fb_ease_high: "Very easy",
  fb_q_order: "Would you order one of these bowls?",
  fb_order_yes: "Yes", fb_order_maybe: "Maybe", fb_order_no: "No",
  fb_q_confusion: "What confused you, if anything? (optional)",
  fb_q_channels: "Where would you most want to use this? (pick any)",
  fb_ch_instore: "At the counter", fb_ch_zalo: "Zalo", fb_ch_website: "Tossful website",
  fb_ch_facebook: "Facebook", fb_ch_other: "Other",
  fb_q_missing: "What is missing that would make it more useful? (optional)",
  fb_q_other: "Anything else? (optional)",
  fb_q_zalo: "Your Zalo (optional, for a thank-you bowl!)",
  fb_zalo_placeholder: "Zalo number or username",
  fb_submit: "Send feedback", fb_submitting: "Sending...",
  fb_required: "Please answer the first two questions before sending.",
  fb_error: "Something went wrong. Please try again or message us on Zalo.",
  fb_thanks_title: "Thank you",
  fb_thanks_body: "Your feedback helps us serve better bowls. We will read every word.",
  fb_thanks_again: "Send another response",
  fb_context_label: "Attached automatically:",
  proteinLbl: "protein", fatLbl: "fat", carbsLbl: "carbs", fiberLbl: "fiber",
  signature_mode: "Signature bowl", byo_mode: "Build your own",
  mode_label: "Mode", bowl_label_ctx: "Bowl", ingredients_label: "Ingredients",
  macros_label: "Macros", language_label: "Language", source_label: "Source",
  empty_alert: "Your bowl is empty. Pick a few ingredients first.",
  save_tip: "Tip: screenshot to save or share. Thanks for trying Tossful!",
};

// === Vietnamese strings (constants up top per session-lessons gotcha) ===
const VI_page_title = "một tô cho mọi người";
const VI_page_subtitle = "bảng dinh dưỡng";
const VI_tab_signature = "Tô signature";
const VI_tab_byo = "Tự thiết kế";
const VI_tab_feedback = "Góp ý";
const VI_hero_title = "Lên kế hoạch tô của bạn.";
const VI_hero_subtitle = "Chọn nguyên liệu để xem dinh dưỡng trực tiếp.";
const VI_bowl_label = "Tô của bạn";
const VI_your_bowl = "Tô của bạn";
const VI_empty_summary = "Chọn nguyên liệu phía trên để bắt đầu.";
const VI_reset = "Làm lại";
const VI_save_bowl = "Lưu tô";
const VI_microcopy = "Dinh dưỡng theo khẩu phần";
const VI_save_soon = "Sap co chuc nang luu";
const VI_bowl_name_label = "Tên bowl";
const VI_bowl_name_placeholder = "Tên bowl";
const VI_bowl_name_hint = "Tự đặt tên từ nguyên liệu — chạm để sửa";
const VI_saving = "Dang luu...";
const VI_signature_modified_suffix = "(chinh sua)";
const VI_start_from_bowl = "Bắt đầu từ món này";
const VI_included_label = "Đã bao gồm";
const VI_included_hint = "Là phần của wrap — không thể bỏ.";
const VI_pick_any = "chọn bất kỳ";
const VI_save_header_named = "Đây là tô của {name}:";
const VI_save_header_anon = "Đây là tô của bạn:";
const VI_save_nutrition_label = "Dinh dưỡng";
const VI_name_placeholder = "Tên của bạn (không bắt buộc)";
const VI_fb_title = "Giúp Tossful tốt hơn";
const VI_fb_intro = "Góp ý của bạn sẽ định hình menu và công cụ này. Chỉ khoảng 1 phút.";
const VI_fb_q_ease = "Công cụ này có dễ dùng không?";
const VI_fb_ease_low = "Khó hiểu";
const VI_fb_ease_high = "Rất dễ";
const VI_fb_q_order = "Bạn có muốn đặt một tô như vậy không?";
const VI_fb_order_yes = "Có";
const VI_fb_order_maybe = "Có thể";
const VI_fb_order_no = "Không";
const VI_fb_q_confusion = "Có chỗ nào khó hiểu không? (không bắt buộc)";
const VI_fb_q_channels = "Bạn muốn dùng công cụ này ở đâu nhất? (chọn nhiều)";
const VI_fb_ch_instore = "Tại quầy";
const VI_fb_ch_zalo = "Zalo";
const VI_fb_ch_website = "Website Tossful";
const VI_fb_ch_facebook = "Facebook";
const VI_fb_ch_other = "Khác";
const VI_fb_q_missing = "Còn thiếu gì để bạn dùng tiện hơn? (không bắt buộc)";
const VI_fb_q_other = "Còn điều gì muốn chia sẻ? (không bắt buộc)";
const VI_fb_q_zalo = "Zalo của bạn (không bắt buộc, tặng tô cảm ơn!)";
const VI_fb_zalo_placeholder = "Số Zalo hoặc tên";
const VI_fb_submit = "Gửi góp ý";
const VI_fb_submitting = "Đang gửi...";
const VI_fb_required = "Vui lòng trả lời 2 câu đầu trước khi gửi.";
const VI_fb_error = "Có lỗi xảy ra. Hãy thử lại hoặc nhắn Zalo cho tụi mình.";
const VI_fb_thanks_title = "Cảm ơn bạn";
const VI_fb_thanks_body = "Góp ý của bạn sẽ giúp tụi mình làm tô ngon hơn. Tụi mình đọc từng dòng.";
const VI_fb_thanks_again = "Gửi góp ý khác";
const VI_fb_context_label = "Tự động đính kèm:";
const VI_proteinLbl = "đạm";
const VI_fatLbl = "béo";
const VI_carbsLbl = "tinh bột";
const VI_fiberLbl = "chất xơ";
const VI_signature_mode = "Tô signature";
const VI_byo_mode = "Tự thiết kế";
const VI_mode_label = "Chế độ";
const VI_bowl_label_ctx = "Tô";
const VI_ingredients_label = "Nguyên liệu";
const VI_macros_label = "Dinh dưỡng";
const VI_language_label = "Ngôn ngữ";
const VI_source_label = "Nguồn";
const VI_empty_alert = "Chưa có gì trong tô — chọn vài nguyên liệu nhé.";
const VI_choose_q = "Bạn muốn bắt đầu thế nào?";
const VI_start_sig = "Bắt đầu với tô signature";
const VI_start_sig_desc = "Xem công thức Tossful rồi tùy chỉnh";
const VI_start_byo = "Tự tạo từ đầu";
const VI_start_byo_desc = "Chọn từng nguyên liệu";
const VI_back_to_start = "Quay lại";
const VI_browse_h = "Chọn một tô signature";
const VI_browse_sub = "Chạm vào một tô để nạp, sau đó tùy chỉnh ở bước tiếp theo.";
const VI_save_tip = "Mẹo: chụp màn hình để lưu hoặc chia sẻ. Cảm ơn bạn đã thử Tossful!";

const VI: StringTable = {
  page_title: VI_page_title, page_subtitle: VI_page_subtitle,
  tab_signature: VI_tab_signature, tab_byo: VI_tab_byo, tab_feedback: VI_tab_feedback,
  hero_title: VI_hero_title, hero_subtitle: VI_hero_subtitle,
  bowl_label: VI_bowl_label,
  macro_cal: "CAL", macro_protein: VI_proteinLbl.toUpperCase(),
  macro_fat: VI_fatLbl.toUpperCase(), macro_carbs: VI_carbsLbl.toUpperCase(),
  macro_fiber: VI_fiberLbl.toUpperCase(),
  your_bowl: VI_your_bowl, empty_summary: VI_empty_summary,
  reset: VI_reset, save_bowl: VI_save_bowl,
  microcopy: VI_microcopy, save_soon: VI_save_soon,
  bowl_name_label: VI_bowl_name_label,
  bowl_name_placeholder: VI_bowl_name_placeholder,
  bowl_name_hint: VI_bowl_name_hint,
  saving: VI_saving,
  signature_modified_suffix: VI_signature_modified_suffix,
  choose_q: VI_choose_q,
  start_sig: VI_start_sig,
  start_sig_desc: VI_start_sig_desc,
  start_byo: VI_start_byo,
  start_byo_desc: VI_start_byo_desc,
  back_to_start: VI_back_to_start,
  browse_h: VI_browse_h,
  browse_sub: VI_browse_sub,
  start_from_bowl: VI_start_from_bowl, pick_any: VI_pick_any,
  included_label: VI_included_label, included_hint: VI_included_hint,
  cat_Base: "Base", cat_Topping: "Topping", cat_Premium: "Premium",
  cat_Dressing: "Dressing", cat_Free: "Free",
  save_header_named: VI_save_header_named, save_header_anon: VI_save_header_anon,
  save_nutrition_label: VI_save_nutrition_label, name_placeholder: VI_name_placeholder,
  fb_title: VI_fb_title, fb_intro: VI_fb_intro,
  fb_q_ease: VI_fb_q_ease, fb_ease_low: VI_fb_ease_low, fb_ease_high: VI_fb_ease_high,
  fb_q_order: VI_fb_q_order, fb_order_yes: VI_fb_order_yes,
  fb_order_maybe: VI_fb_order_maybe, fb_order_no: VI_fb_order_no,
  fb_q_confusion: VI_fb_q_confusion, fb_q_channels: VI_fb_q_channels,
  fb_ch_instore: VI_fb_ch_instore, fb_ch_zalo: VI_fb_ch_zalo,
  fb_ch_website: VI_fb_ch_website, fb_ch_facebook: VI_fb_ch_facebook,
  fb_ch_other: VI_fb_ch_other,
  fb_q_missing: VI_fb_q_missing, fb_q_other: VI_fb_q_other,
  fb_q_zalo: VI_fb_q_zalo, fb_zalo_placeholder: VI_fb_zalo_placeholder,
  fb_submit: VI_fb_submit, fb_submitting: VI_fb_submitting,
  fb_required: VI_fb_required, fb_error: VI_fb_error,
  fb_thanks_title: VI_fb_thanks_title, fb_thanks_body: VI_fb_thanks_body,
  fb_thanks_again: VI_fb_thanks_again, fb_context_label: VI_fb_context_label,
  proteinLbl: VI_proteinLbl, fatLbl: VI_fatLbl, carbsLbl: VI_carbsLbl, fiberLbl: VI_fiberLbl,
  signature_mode: VI_signature_mode, byo_mode: VI_byo_mode,
  mode_label: VI_mode_label, bowl_label_ctx: VI_bowl_label_ctx,
  ingredients_label: VI_ingredients_label, macros_label: VI_macros_label,
  language_label: VI_language_label, source_label: VI_source_label,
  empty_alert: VI_empty_alert, save_tip: VI_save_tip,
};

export const I18N: Record<Lang, StringTable> = { en: EN, vi: VI };

export function t(lang: Lang, key: keyof StringTable): string {
  return I18N[lang][key] ?? I18N.en[key] ?? String(key);
}
// trailing buffer comment to keep file end on ASCII
