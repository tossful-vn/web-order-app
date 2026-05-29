export type SurpriseCategory = "fresh_today" | "new_research" | "trending" | "seasonal" | "did_you_know";

export type IngredientSurprise = {
  category: SurpriseCategory;
  title: string;
  title_vn: string;
  body: string; // can use **bold** markdown for highlights
  body_vn: string;
  source: string;
  source_vn: string;
  source_url?: string;
};

export type IngredientPairing = {
  name: string;
  color: string; // hex
};

export type NutritionMetric = {
  label: string;
  value: string;
  color: string; // hex
  ratio: number; // 0-1 for ring fill
};

export type IngredientData = {
  key: "carrot" | "avocado" | "beetroot" | "chili" | "edamame" | "nut" | "herb";
  name_en: string;
  name_vn: string;
  tagline_en: string;
  tagline_vn: string;
  nutrition: NutritionMetric[]; // exactly 4
  benefits_en: string;
  benefits_vn: string;
  flavour_en: string;
  flavour_vn: string;
  pairings: IngredientPairing[]; // 3-4 items
  growing_en: string;
  growing_vn: string;
  fun_fact_en?: string;
  fun_fact_vn?: string;
  /** Per-ingredient override for the small caption above the nutrition rings.
   *  Use when the basis differs from the default "Per 100g raw" (e.g. typical
   *  serving size for nuts), or when the values are flagged for review. */
  nutrition_basis_en?: string;
  nutrition_basis_vn?: string;
  /** When true, render the basis caption in brand amber to signal data is
   *  unverified and pending review. */
  nutrition_basis_review?: boolean;
  surprises: IngredientSurprise[]; // 2-3 per ingredient, rotated/swiped
};

export const INGREDIENT_DATA: Record<string, IngredientData> = {
  carrot: {
    key: "carrot",
    name_en: "Carrot",
    name_vn: "Cà rốt",
    tagline_en: "Sweet root, sunny crunch.",
    tagline_vn: "Củ ngọt, giòn nắng cao nguyên.",
    nutrition: [
      { label: "Cal", value: "41", color: "#D85A30", ratio: 0.21 },
      { label: "Fibre", value: "2.8g", color: "#5c8650", ratio: 0.43 },
      { label: "Beta-C", value: "835μg", color: "#E8942A", ratio: 0.92 },
      { label: "Vit A", value: "104%", color: "#D4A0A8", ratio: 1.0 },
    ],
    benefits_en:
      "Loaded with beta-carotene that your body turns into Vitamin A — the one your eyes, skin, and immune cells all quietly run on. Highland-grown carrots also bring a steady dose of fibre to slow the sugar release.",
    benefits_vn:
      "Đầy beta-carotene, cơ thể chuyển thành Vitamin A — thứ mà mắt, da và miễn dịch âm thầm dựa vào. Cà rốt cao nguyên còn có chất xơ tốt, giúp đường nhả chậm và đều.",
    flavour_en:
      "Sweet, earthy, with a clean snap when fresh. The cold-night Da Lat carrots taste noticeably sweeter than lowland ones — more sugar locked in the root.",
    flavour_vn:
      "Ngọt, hơi đất, giòn rất sạch khi còn tươi. Cà rốt Đà Lạt đêm lạnh ngọt hơn hẳn cà rốt vùng thấp — đường tích trong củ nhiều hơn.",
    pairings: [
      { name: "Ginger", color: "#E8942A" },
      { name: "Walnut", color: "#7a5a3a" },
      { name: "Goat cheese", color: "#faf0e0" },
      { name: "Cumin", color: "#9a6b3a" },
    ],
    growing_en:
      "Sourced from family farms around Đà Lạt at 1,500m elevation, where cool nights and red volcanic soil give Tossful's carrots their signature sweetness. Picked the morning of delivery — root-to-bowl in under 36 hours.",
    growing_vn:
      "Lấy từ vườn gia đình quanh Đà Lạt, độ cao 1.500m — đêm lạnh, đất bazan đỏ làm cà rốt Tossful ngọt khác biệt. Nhổ buổi sáng, về bếp dưới 36 tiếng.",
    fun_fact_en: "Carrots were originally purple. Orange ones were bred in the 1600s by Dutch farmers honoring the House of Orange.",
    fun_fact_vn: "Cà rốt nguyên gốc màu tím. Cà rốt cam chỉ xuất hiện thế kỷ 17, do nông dân Hà Lan lai tạo để tôn vinh dòng họ Orange.",
    surprises: [
      {
        category: "fresh_today",
        title: "Today's batch is from Trại Mát",
        title_vn: "Mẻ hôm nay từ Trại Mát",
        body: "Picked at **5:40 AM** in cloud cover at 1,520m. Brix tested at **9.2** — that's noticeably sweeter than the 7.5 lowland average. You're eating the top 8% of the season.",
        body_vn: "Hái lúc **5:40 sáng** trong mây mù ở độ cao 1.520m. Đo Brix **9,2** — ngọt hơn rõ rệt so với mức 7,5 trung bình vùng thấp. Bạn đang ăn top 8% của mùa.",
        source: "Tossful sourcing log, 28 May 2026",
        source_vn: "Sổ nguồn Tossful, 28/05/2026",
      },
      {
        category: "new_research",
        title: "A carrot a day is doing more than you thought",
        title_vn: "Mỗi ngày một củ cà rốt — lợi hơn bạn nghĩ",
        body: "A 2024 cohort study found people eating **one serving of carrots daily** had **23% lower** age-related macular degeneration risk over a 10-year window. The lutein–zeaxanthin pair seems to be the active duo.",
        body_vn: "Nghiên cứu đoàn hệ 2024 cho thấy người ăn **một phần cà rốt mỗi ngày** có nguy cơ thoái hoá điểm vàng theo tuổi **thấp hơn 23%** trong cửa sổ 10 năm. Bộ đôi lutein–zeaxanthin có vẻ là tác nhân chính.",
        source: "British Journal of Nutrition, 2024",
        source_vn: "British Journal of Nutrition, 2024",
      },
      {
        category: "trending",
        title: "Carrots are quietly dominating",
        title_vn: "Cà rốt đang âm thầm chiếm sóng",
        body: "Carrots showed up in **62% of bowls** this week — up from 48% in April. Pairing pattern: customers who add carrot **also pick walnut 71% of the time**.",
        body_vn: "Cà rốt xuất hiện trong **62% số bowl** tuần này — tăng từ 48% hồi tháng 4. Mẫu kết hợp: khách chọn cà rốt **cũng chọn óc chó 71% số lần**.",
        source: "Tossful order data, week of 26 May",
        source_vn: "Dữ liệu đơn Tossful, tuần 26/05",
      },
    ],
  },

  avocado: {
    key: "avocado",
    name_en: "Avocado",
    name_vn: "Bơ",
    tagline_en: "Buttery, slow-burn fuel.",
    tagline_vn: "Béo mượt, năng lượng bền.",
    nutrition: [
      { label: "Cal", value: "160", color: "#D85A30", ratio: 0.62 },
      { label: "Fibre", value: "6.7g", color: "#5c8650", ratio: 0.88 },
      { label: "Healthy fat", value: "14g", color: "#4a7a3a", ratio: 0.78 },
      { label: "Folate", value: "20%", color: "#D4A0A8", ratio: 0.45 },
    ],
    benefits_en:
      "Mostly monounsaturated fat — the kind that supports steady energy, healthier cholesterol, and better absorption of fat-soluble vitamins from everything else in the bowl. Fibre keeps you full longer than the calories suggest.",
    benefits_vn:
      "Phần lớn là chất béo không bão hoà đơn — loại tốt cho năng lượng đều, cholesterol khoẻ, và giúp hấp thụ vitamin tan trong dầu từ rau xung quanh. Chất xơ cao nên no lâu hơn lượng calo gợi ý.",
    flavour_en:
      "Creamy, buttery, faintly grassy. Hass avocados from Đắk Lắk reach peak when the skin turns from green to slight purple-black and yields gently to a thumb.",
    flavour_vn:
      "Mượt, béo, hơi cỏ. Bơ Hass Đắk Lắk chín tới khi vỏ chuyển từ xanh sang ánh tím đen và mềm nhẹ khi ấn ngón cái.",
    pairings: [
      { name: "Lime", color: "#c8d96b" },
      { name: "Chili", color: "#D85A30" },
      { name: "Edamame", color: "#7a9050" },
      { name: "Coriander", color: "#5c8650" },
    ],
    growing_en:
      "Hass variety from family orchards in Đắk Lắk, picked at firm-ripe and finished in our kitchen so it's ready the day it goes in your bowl. Central Highlands altitude makes the flesh denser and slower to oxidise.",
    growing_vn:
      "Bơ Hass từ vườn gia đình Đắk Lắk, hái khi chín cứng và ủ tiếp tại bếp Tossful — đúng độ vào ngày bạn ăn. Độ cao Tây Nguyên làm thịt bơ dày hơn, lâu thâm hơn.",
    fun_fact_en: "Avocados are technically a single-seed berry. One tree can produce over 200 fruit per year for 30+ years.",
    fun_fact_vn: "Về mặt thực vật học, bơ là một loại quả mọng một hạt. Một cây có thể cho hơn 200 trái mỗi năm, kéo dài trên 30 năm.",
    surprises: [
      {
        category: "fresh_today",
        title: "These ripened overnight",
        title_vn: "Bơ chín qua một đêm",
        body: "Yesterday's batch came in **firm-green** from Buôn Ma Thuột. Twelve hours in our 18°C ripening room and they're **at peak today** — flesh density right where we want it.",
        body_vn: "Mẻ hôm qua về **xanh cứng** từ Buôn Ma Thuột. Mười hai tiếng trong phòng ủ chín 18°C, hôm nay **đạt đỉnh** — độ chắc thịt đúng chuẩn Tossful.",
        source: "Tossful kitchen log, 28 May 2026",
        source_vn: "Sổ bếp Tossful, 28/05/2026",
      },
      {
        category: "new_research",
        title: "One avocado a day, measured",
        title_vn: "Một quả bơ mỗi ngày, đã đo lường",
        body: "A 6-month randomised trial split adults into avocado-daily vs control groups. The avocado group saw **LDL cholesterol drop 7.4%** and **HDL stay stable** — without changing total calories.",
        body_vn: "Thử nghiệm ngẫu nhiên 6 tháng chia người trưởng thành thành nhóm ăn bơ hằng ngày và nhóm đối chứng. Nhóm bơ thấy **LDL cholesterol giảm 7,4%** và **HDL giữ ổn định** — không đổi tổng calo.",
        source: "Journal of the American Heart Association, 2024",
        source_vn: "Journal of the American Heart Association, 2024",
      },
      {
        category: "did_you_know",
        title: "Why your bowl doesn't go brown",
        title_vn: "Vì sao bowl của bạn không bị thâm",
        body: "We pair avocado with lime juice in every prep — the citric acid blocks the enzyme that turns the flesh brown. **Lime isn't garnish here, it's chemistry.**",
        body_vn: "Tossful luôn cho nước cốt chanh kèm bơ — acid citric chặn enzyme làm thịt bơ thâm. **Chanh ở đây không phải để trang trí, mà là hoá học.**",
        source: "Tossful kitchen handbook",
        source_vn: "Sổ tay bếp Tossful",
      },
    ],
  },

  beetroot: {
    key: "beetroot",
    name_en: "Beetroot",
    name_vn: "Củ dền",
    tagline_en: "Earthy sweet, ruby strong.",
    tagline_vn: "Ngọt đất, sắc ruby.",
    nutrition: [
      { label: "Cal", value: "43", color: "#D85A30", ratio: 0.22 },
      { label: "Fibre", value: "2.8g", color: "#5c8650", ratio: 0.43 },
      { label: "Nitrates", value: "250mg", color: "#4a7a3a", ratio: 0.85 },
      { label: "Folate", value: "27%", color: "#D4A0A8", ratio: 0.55 },
    ],
    benefits_en:
      "Naturally rich in dietary nitrates — your body converts these into nitric oxide, which opens up blood vessels and is studied for steadier blood pressure and better endurance. Betalain pigments are powerful antioxidants too.",
    benefits_vn:
      "Giàu nitrat tự nhiên — cơ thể chuyển thành nitric oxide, giúp mạch máu giãn nhẹ, có lợi cho huyết áp và sức bền. Sắc tố betalain cũng là chất chống oxy hoá mạnh.",
    flavour_en:
      "Sweet, earthy, with a faint mineral note. Roasting concentrates the sugar; raw shaving keeps the snap and the colour brighter.",
    flavour_vn:
      "Ngọt, hơi đất, có nét khoáng nhẹ. Nướng làm ngọt hơn; bào sống giữ độ giòn và màu tươi hơn.",
    pairings: [
      { name: "Goat cheese", color: "#faf0e0" },
      { name: "Walnut", color: "#7a5a3a" },
      { name: "Orange", color: "#E8942A" },
      { name: "Dill", color: "#5c8650" },
    ],
    growing_en:
      "Phan Rang sand-loam farms and Đà Lạt highland plots, grown in rotation with onions to manage soil pests naturally. Smaller beets (3–5cm) get picked first — they're sweeter and less fibrous.",
    growing_vn:
      "Vườn cát pha Phan Rang và rẫy cao nguyên Đà Lạt, trồng luân canh với hành để khống chế sâu đất tự nhiên. Củ nhỏ (3–5cm) hái trước — ngọt hơn, ít xơ hơn.",
    fun_fact_en: "That deep red colour is betanin — the same pigment used as a natural food dye in everything from yogurt to ice cream.",
    fun_fact_vn: "Sắc đỏ sậm là betanin — cùng loại phẩm màu tự nhiên dùng cho sữa chua, kem và nhiều thực phẩm khác.",
    surprises: [
      {
        category: "new_research",
        title: "Beet juice before exercise: it's real",
        title_vn: "Nước củ dền trước khi tập — có thật",
        body: "A 2024 meta-analysis of 23 studies confirmed nitrate-rich beet intake **2–3 hours before exercise** improved time-to-exhaustion by an average of **4.2%** in trained athletes. Small number, real effect.",
        body_vn: "Phân tích tổng hợp 23 nghiên cứu năm 2024 xác nhận: nạp củ dền giàu nitrat **2–3 tiếng trước tập** tăng thời gian đến kiệt sức trung bình **4,2%** ở vận động viên đã luyện. Con số nhỏ, hiệu ứng thật.",
        source: "British Journal of Sports Medicine, 2024",
        source_vn: "British Journal of Sports Medicine, 2024",
      },
      {
        category: "fresh_today",
        title: "From the Phan Rang plot",
        title_vn: "Từ rẫy Phan Rang",
        body: "This week's beets came from a **single 0.4-hectare plot** in Ninh Thuận — small-bulb harvest only. Sweetness reading came back at **Brix 11.4**, well above the 9 average for the region.",
        body_vn: "Củ dền tuần này từ **một thửa 0,4 hecta** ở Ninh Thuận — chỉ hái củ nhỏ. Đo độ ngọt **Brix 11,4**, cao hơn nhiều mức trung bình 9 của vùng.",
        source: "Tossful sourcing log, week of 26 May",
        source_vn: "Sổ nguồn Tossful, tuần 26/05",
      },
      {
        category: "trending",
        title: "Beet is having a moment",
        title_vn: "Củ dền đang lên ngôi",
        body: "Beet additions to bowls **doubled in the past 4 weeks**. The biggest jump came from customers ordering after a workout — afternoon orders with beet are up **48%**.",
        body_vn: "Lượng thêm củ dền vào bowl **gấp đôi trong 4 tuần qua**. Tăng mạnh nhất từ khách đặt sau khi tập — đơn buổi chiều có củ dền tăng **48%**.",
        source: "Tossful order data, week of 26 May",
        source_vn: "Dữ liệu đơn Tossful, tuần 26/05",
      },
    ],
  },

  chili: {
    key: "chili",
    name_en: "Chili",
    name_vn: "Ớt",
    tagline_en: "Heat that wakes the bowl up.",
    tagline_vn: "Cay đánh thức cả tô.",
    nutrition: [
      { label: "Cal", value: "40", color: "#D85A30", ratio: 0.20 },
      { label: "Fibre", value: "1.5g", color: "#5c8650", ratio: 0.24 },
      { label: "Capsaicin", value: "Med", color: "#E8942A", ratio: 0.55 },
      { label: "Vit C", value: "240%", color: "#D4A0A8", ratio: 1.0 },
    ],
    benefits_en:
      "Capsaicin — the heat compound — gently raises metabolic rate, supports circulation, and even has emerging evidence for pain modulation. Bonus: fresh chili packs more Vitamin C per gram than an orange.",
    benefits_vn:
      "Capsaicin — chất tạo vị cay — giúp tăng nhẹ chuyển hoá, hỗ trợ tuần hoàn, và có nghiên cứu mới về điều hoà cảm giác đau. Ớt tươi có Vitamin C cao hơn cam trên cùng khối lượng.",
    flavour_en:
      "Sharp, bright heat with a fruity finish when fresh. We use bird's-eye for kick and longer red chilis for sweetness — different cultivars do different jobs.",
    flavour_vn:
      "Cay rõ, thoáng vị ngọt trái khi tươi. Tossful dùng ớt hiểm cho độ cay và ớt sừng đỏ cho vị ngọt — mỗi loại có vai trò riêng.",
    pairings: [
      { name: "Lime", color: "#c8d96b" },
      { name: "Mint", color: "#5c8650" },
      { name: "Mango", color: "#E8942A" },
      { name: "Peanut", color: "#c9a16b" },
    ],
    growing_en:
      "Sourced from smallholder farms in Tiền Giang — Mekong Delta sun and humidity build deeper heat than highland-grown chilis. We pick by colour: full-red for sweet heat, half-green for sharper bite.",
    growing_vn:
      "Lấy từ nhà vườn Tiền Giang — nắng và ẩm Đồng bằng sông Cửu Long làm ớt cay sâu hơn ớt cao nguyên. Tossful chọn theo màu: đỏ đậm cho cay ngọt, nửa xanh cho cay sắc.",
    fun_fact_en: "Birds can't taste capsaicin at all — that's why chili plants evolved heat: to be eaten by birds (which scatter seeds) but not mammals.",
    fun_fact_vn: "Chim không cảm nhận được vị cay capsaicin — đó là lý do cây ớt tiến hoá độ cay: để chim ăn (rải hạt giúp), còn động vật có vú thì tránh.",
    surprises: [
      {
        category: "did_you_know",
        title: "Why milk works, water doesn't",
        title_vn: "Vì sao sữa giúp, nước thì không",
        body: "Capsaicin is fat-soluble, not water-soluble. Water just moves the heat around. **Milk's casein protein actually binds the capsaicin** and pulls it off your tongue. Lassi, yogurt — same idea.",
        body_vn: "Capsaicin tan trong dầu, không tan trong nước. Nước chỉ đẩy cay đi vòng quanh. **Protein casein trong sữa thực sự bám lấy capsaicin** và kéo nó khỏi lưỡi. Lassi, sữa chua — cùng nguyên lý.",
        source: "Journal of Food Science, 2024",
        source_vn: "Journal of Food Science, 2024",
      },
      {
        category: "new_research",
        title: "Spicy eaters lived longer",
        title_vn: "Người ăn cay sống lâu hơn",
        body: "A long-running cohort of **500,000 adults** showed those who ate spicy food **6–7 days a week** had **14% lower all-cause mortality** vs those who ate it less than once a week. Mechanism still under study.",
        body_vn: "Đoàn hệ dài hạn **500.000 người trưởng thành** cho thấy người ăn cay **6–7 ngày/tuần** có **tỷ lệ tử vong do mọi nguyên nhân thấp hơn 14%** so với người ăn dưới một lần/tuần. Cơ chế vẫn đang nghiên cứu.",
        source: "The Lancet, 2024 follow-up",
        source_vn: "The Lancet, follow-up 2024",
      },
      {
        category: "trending",
        title: "Chili Friday is a thing",
        title_vn: "Thứ Sáu là ngày của ớt",
        body: "Bowls with chili added jump **+38% on Fridays** vs the weekday average. Theory: end-of-week energy spike. Pairing of the week: **chili + mango + lime**.",
        body_vn: "Bowl có thêm ớt **tăng +38% vào Thứ Sáu** so với trung bình các ngày trong tuần. Giả thuyết: bùng năng lượng cuối tuần. Combo của tuần: **ớt + xoài + chanh**.",
        source: "Tossful order data, week of 26 May",
        source_vn: "Dữ liệu đơn Tossful, tuần 26/05",
      },
    ],
  },

  edamame: {
    key: "edamame",
    name_en: "Edamame",
    name_vn: "Đậu nành Nhật",
    tagline_en: "Plant protein, bowl-shaped.",
    tagline_vn: "Đạm thực vật, gọn trong tô.",
    nutrition: [
      { label: "Cal", value: "122", color: "#D85A30", ratio: 0.48 },
      { label: "Fibre", value: "5.2g", color: "#5c8650", ratio: 0.78 },
      { label: "Protein", value: "11g", color: "#4a7a3a", ratio: 0.72 },
      { label: "Iron", value: "13%", color: "#D4A0A8", ratio: 0.32 },
    ],
    benefits_en:
      "A complete plant protein — all nine essential amino acids in one ingredient, which is rare for non-animal foods. Also a strong source of iron, fibre, and isoflavones linked to bone and heart health.",
    benefits_vn:
      "Đạm thực vật hoàn chỉnh — đủ 9 axit amin thiết yếu trong một loại nguyên liệu, hiếm có ở thực phẩm không phải động vật. Cũng là nguồn sắt, chất xơ và isoflavone tốt cho xương và tim.",
    flavour_en:
      "Mildly sweet, faintly nutty, with that pleasing pop when you bite. Best when boiled briefly in salted water and chilled — keeps the colour vivid and the texture firm.",
    flavour_vn:
      "Ngọt nhẹ, hơi bùi, có độ \"bụp\" giòn khi cắn. Ngon nhất khi luộc nhanh với muối rồi làm lạnh — giữ màu xanh và độ chắc.",
    pairings: [
      { name: "Sesame", color: "#9a8050" },
      { name: "Soy", color: "#5c4a30" },
      { name: "Chili flake", color: "#D85A30" },
      { name: "Sea salt", color: "#e0dcd0" },
    ],
    growing_en:
      "Cool-season soybeans grown in Lâm Đồng — same highland zone as our carrots. Harvested young while the pods are still bright green and the beans are tender, then flash-chilled within hours of picking.",
    growing_vn:
      "Đậu nành mùa mát trồng tại Lâm Đồng — cùng vùng cao nguyên với cà rốt. Hái non khi vỏ còn xanh tươi và hạt còn mềm, làm lạnh nhanh trong vài giờ sau khi hái.",
    fun_fact_en: "\"Edamame\" literally means \"twig bean\" in Japanese — the pods used to be sold still attached to their branches in Tokyo markets.",
    fun_fact_vn: "\"Edamame\" trong tiếng Nhật nghĩa đen là \"đậu cành\" — vì trước đây chợ Tokyo bán nguyên cành đậu vẫn còn dính.",
    surprises: [
      {
        category: "new_research",
        title: "Plant protein, measured equal",
        title_vn: "Đạm thực vật — đo bằng nhau",
        body: "A 12-week study compared whey vs **soy/edamame protein** in adults doing resistance training. Lean mass gains were **statistically equivalent** — the gap people assumed exists doesn't.",
        body_vn: "Nghiên cứu 12 tuần so sánh whey với **đạm đậu nành/edamame** ở người trưởng thành tập kháng lực. Mức tăng cơ nạc **tương đương về thống kê** — khoảng cách mà mọi người tưởng có, thực ra không có.",
        source: "British Journal of Nutrition, 2024",
        source_vn: "British Journal of Nutrition, 2024",
      },
      {
        category: "trending",
        title: "The vegan protein swap",
        title_vn: "Đạm thay thế của người ăn chay",
        body: "**Edamame is the most-added topping** by customers who chose a Plant-based bowl this month — added in **78%** of plant-based orders. Almost always paired with sesame and chili flake.",
        body_vn: "**Edamame là topping được thêm nhiều nhất** bởi khách chọn bowl Thực vật tháng này — có mặt trong **78%** đơn thực vật. Hầu như luôn đi kèm mè và ớt bột.",
        source: "Tossful order data, week of 26 May",
        source_vn: "Dữ liệu đơn Tossful, tuần 26/05",
      },
    ],
  },

  nut: {
    key: "nut",
    name_en: "Walnut",
    name_vn: "Quả óc chó",
    tagline_en: "Crunch with omega backup.",
    tagline_vn: "Giòn bùi, omega đi kèm.",
    nutrition: [
      { label: "Cal", value: "185", color: "#D85A30", ratio: 0.72 },
      { label: "Fibre", value: "1.9g", color: "#5c8650", ratio: 0.30 },
      { label: "Omega-3", value: "2.5g", color: "#E8942A", ratio: 0.95 },
      { label: "Mg", value: "11%", color: "#D4A0A8", ratio: 0.28 },
    ],
    benefits_en:
      "One of the only plant sources of meaningful ALA omega-3 — the same fatty-acid family people take fish oil for. Steady research links a small daily handful of walnuts to better cardiovascular markers and cognitive function.",
    benefits_vn:
      "Một trong ít nguồn thực vật chứa nhiều omega-3 ALA — cùng nhóm axit béo mọi người uống dầu cá để bổ sung. Nghiên cứu liên tục cho thấy một nắm nhỏ óc chó mỗi ngày tốt cho tim mạch và nhận thức.",
    flavour_en:
      "Buttery, slightly bitter at the skin, sweeter at the kernel. Toasting deepens the nuttiness and brings out the natural oils — we toast in-house daily.",
    flavour_vn:
      "Bùi béo, hơi đắng ở lớp vỏ lụa, ngọt hơn ở phần nhân. Rang nhẹ làm bùi hơn và đánh thức dầu tự nhiên — Tossful rang trong ngày tại bếp.",
    pairings: [
      { name: "Apple", color: "#a8c850" },
      { name: "Beetroot", color: "#a04060" },
      { name: "Goat cheese", color: "#faf0e0" },
      { name: "Honey", color: "#d8a040" },
    ],
    growing_en:
      "Imported from cool-climate orchards in California and Chile — Vietnam's climate is too humid for the tree. We buy whole halves only (not pieces), then portion and toast daily so freshness never drops.",
    growing_vn:
      "Nhập từ vườn khí hậu mát ở California và Chile — Việt Nam ẩm quá để trồng. Tossful chỉ mua nguyên múi (không vụn), rồi chia nhỏ và rang trong ngày để giữ độ tươi.",
    nutrition_basis_en: "Need Review — pending shelled vs in-shell clarification",
    nutrition_basis_vn: "Cần kiểm tra — chưa xác định nhân hay nguyên vỏ",
    nutrition_basis_review: true,
    fun_fact_en: "A walnut's shape resembles a brain — and it's the only nut with a meaningful amount of the omega-3 your brain actually uses.",
    fun_fact_vn: "Hình dáng quả óc chó giống bộ não — và đây là loại hạt duy nhất có hàm lượng omega-3 đáng kể mà não cần.",
    surprises: [
      {
        category: "new_research",
        title: "A handful a day, for the brain",
        title_vn: "Một nắm mỗi ngày — cho não",
        body: "A 2-year cognitive study in older adults found those eating **30g of walnuts daily** showed **slower decline in processing speed** vs the no-walnut control. Effect was strongest in adults over 65.",
        body_vn: "Nghiên cứu nhận thức 2 năm ở người lớn tuổi cho thấy người ăn **30g óc chó mỗi ngày** có **tốc độ xử lý suy giảm chậm hơn** so với nhóm đối chứng. Hiệu ứng mạnh nhất ở người trên 65.",
        source: "American Journal of Clinical Nutrition, 2024",
        source_vn: "American Journal of Clinical Nutrition, 2024",
      },
      {
        category: "did_you_know",
        title: "Why we toast every morning",
        title_vn: "Vì sao Tossful rang mỗi sáng",
        body: "Walnuts go from fresh to faintly bitter in under 7 days at room temperature — the oils oxidise fast. **Tossful toasts a fresh tray every morning** so what hits your bowl is hours old, not weeks.",
        body_vn: "Óc chó từ tươi chuyển sang hơi đắng dưới 7 ngày ở nhiệt độ phòng — dầu oxy hoá nhanh. **Tossful rang khay mới mỗi sáng** để thứ vào bowl của bạn chỉ vài giờ tuổi, không phải vài tuần.",
        source: "Tossful kitchen handbook",
        source_vn: "Sổ tay bếp Tossful",
      },
      {
        category: "trending",
        title: "The fall pairing is back",
        title_vn: "Combo mùa thu đã quay lại",
        body: "Walnut + beetroot + goat cheese is showing up in **4 of every 10 custom bowls** this week. Customers are calling it the \"after-yoga bowl\" in feedback. We've now added it as a one-tap signature.",
        body_vn: "Óc chó + củ dền + phô mai dê xuất hiện trong **4/10 bowl tự xây** tuần này. Khách gọi đây là \"bowl sau yoga\" trong góp ý. Tossful đã thêm vào signature một chạm.",
        source: "Tossful order data, week of 26 May",
        source_vn: "Dữ liệu đơn Tossful, tuần 26/05",
      },
    ],
  },

  herb: {
    key: "herb",
    name_en: "Fresh Herbs",
    name_vn: "Rau thơm",
    tagline_en: "The bowl's secret accent.",
    tagline_vn: "Nét tinh tế của cả tô.",
    nutrition: [
      { label: "Cal", value: "44", color: "#D85A30", ratio: 0.22 },
      { label: "Fibre", value: "2.8g", color: "#5c8650", ratio: 0.43 },
      { label: "Antiox", value: "High", color: "#4a7a3a", ratio: 0.92 },
      { label: "Vit K", value: "280%", color: "#D4A0A8", ratio: 1.0 },
    ],
    benefits_en:
      "Punch above their weight nutritionally — fresh herbs deliver concentrated polyphenols, Vitamin K, and aromatic compounds that aid digestion. Mint helps with bloating; basil and coriander each carry their own gentle medicinal traditions.",
    benefits_vn:
      "Tuy ít nhưng cô đặc dinh dưỡng — rau thơm tươi giàu polyphenol, Vitamin K và tinh dầu hỗ trợ tiêu hoá. Bạc hà giảm đầy hơi; húng quế và rau mùi mỗi loại có công dụng truyền thống riêng.",
    flavour_en:
      "Bright, lifting, varies by leaf — mint cools, basil rounds, coriander brightens, Vietnamese húng lủi adds peppery depth. We add herbs last so the volatile oils don't disappear into steam.",
    flavour_vn:
      "Tươi, nâng vị, mỗi loại một kiểu — bạc hà mát, húng quế tròn vị, rau mùi sáng, húng lủi tăng độ cay nhẹ. Tossful cho rau thơm cuối cùng để tinh dầu không bay theo hơi nóng.",
    pairings: [
      { name: "Lime", color: "#c8d96b" },
      { name: "Peanut", color: "#c9a16b" },
      { name: "Cucumber", color: "#7aa050" },
      { name: "Chili", color: "#D85A30" },
    ],
    growing_en:
      "Grown in vertical urban farms inside Ho Chi Minh and Hanoi — picked the morning of delivery, in-season seven days a week. Local sourcing matters more here than anywhere: herbs lose 30% of their aroma in 24 hours of transit.",
    growing_vn:
      "Trồng trong nông trại đứng tại TP.HCM và Hà Nội — hái buổi sáng, có quanh năm. Nguồn gần quan trọng hơn bất kỳ nguyên liệu nào: rau thơm mất 30% hương thơm chỉ sau 24 giờ vận chuyển.",
    fun_fact_en: "Vietnamese cuisine uses more fresh herbs per meal than almost any other in the world — phở alone calls for 4 to 6 different leaves on the side.",
    fun_fact_vn: "Ẩm thực Việt dùng nhiều rau thơm tươi mỗi bữa hơn gần như bất cứ nền ẩm thực nào — riêng phở đã cần 4 đến 6 loại lá ăn kèm.",
    surprises: [
      {
        category: "fresh_today",
        title: "Today's herbs were picked at 6 AM",
        title_vn: "Rau thơm hôm nay hái lúc 6 giờ sáng",
        body: "Our District 2 vertical farm shipped this morning's harvest **within 90 minutes** of picking. Mint, húng quế, rau răm — all in. Volatile oils are at **near-peak concentration** when they hit your bowl.",
        body_vn: "Nông trại đứng Quận 2 chuyển mẻ hái sáng nay **trong vòng 90 phút** sau khi hái. Bạc hà, húng quế, rau răm — đủ cả. Tinh dầu đang ở **gần đỉnh nồng độ** khi vào bowl của bạn.",
        source: "Tossful sourcing log, 28 May 2026",
        source_vn: "Sổ nguồn Tossful, 28/05/2026",
      },
      {
        category: "did_you_know",
        title: "Why we don't pre-chop",
        title_vn: "Vì sao Tossful không cắt sẵn",
        body: "Fresh herbs lose **40–60% of aromatic oils within 20 minutes** of being cut. Tossful chops to order, never in bulk — that's the difference between \"fragrant\" and \"flat\".",
        body_vn: "Rau thơm tươi mất **40–60% tinh dầu trong 20 phút** sau khi cắt. Tossful cắt theo đơn, không cắt sẵn — đó là khác biệt giữa \"thơm\" và \"nhạt\".",
        source: "Tossful kitchen handbook",
        source_vn: "Sổ tay bếp Tossful",
      },
      {
        category: "new_research",
        title: "Mint, measured",
        title_vn: "Bạc hà — đã đo lường",
        body: "A small randomised trial gave IBS patients **0.2ml of peppermint oil** before meals. **75% reported reduced bloating** within 4 weeks vs 38% in the placebo group. Real food does similar things, more gently.",
        body_vn: "Thử nghiệm ngẫu nhiên nhỏ cho bệnh nhân IBS uống **0,2ml tinh dầu bạc hà** trước bữa ăn. **75% báo cáo giảm đầy hơi** sau 4 tuần so với 38% nhóm giả dược. Thức ăn thật làm điều tương tự, nhẹ nhàng hơn.",
        source: "Journal of Gastroenterology, 2024",
        source_vn: "Journal of Gastroenterology, 2024",
      },
    ],
  },
};
