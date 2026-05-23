import "./macro-panel.css";

const RDI_DEFAULT = { cal: 2000, protein: 50, fat: 70, carbs: 260, fibre: 28 };
const RING_C = 188.5;

type Totals = {
  cal: number;
  protein: number;
  fat: number;
  carbs: number;
  fibre: number;
};

type Labels = {
  cal: string;
  protein: string;
  fat: string;
  carbs: string;
  fiber: string;
};

const DEFAULT_LABELS: Labels = {
  cal: "CAL",
  protein: "PROTEIN",
  fat: "FAT",
  carbs: "CARBS",
  fiber: "FIBER",
};

function pctDash(value: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(value / target, 1) * RING_C;
}

type Props = {
  totals: Totals;
  label: string;
  macroLabels?: Labels;
  rdi?: typeof RDI_DEFAULT;
  dim?: boolean;
  className?: string;
};

export default function MacroPanel({
  totals,
  label,
  macroLabels = DEFAULT_LABELS,
  rdi = RDI_DEFAULT,
  dim = false,
  className = "",
}: Props) {
  const items: Array<{ key: "cal" | "protein" | "fat" | "carbs" | "fiber"; val: string; pct: number; lbl: string }> = [
    { key: "cal", val: Math.round(totals.cal).toLocaleString(), pct: pctDash(totals.cal, rdi.cal), lbl: macroLabels.cal },
    { key: "protein", val: `${totals.protein.toFixed(0)}g`, pct: pctDash(totals.protein, rdi.protein), lbl: macroLabels.protein },
    { key: "fat", val: `${totals.fat.toFixed(0)}g`, pct: pctDash(totals.fat, rdi.fat), lbl: macroLabels.fat },
    { key: "carbs", val: `${totals.carbs.toFixed(0)}g`, pct: pctDash(totals.carbs, rdi.carbs), lbl: macroLabels.carbs },
    { key: "fiber", val: `${totals.fibre.toFixed(0)}g`, pct: pctDash(totals.fibre, rdi.fibre), lbl: macroLabels.fiber },
  ];
  return (
    <div
      className={`macro-panel ${dim ? "dim" : ""} ${className}`.trim()}
      style={{ ["--macro-label" as never]: `"${label}"` }}
    >
      <div className="igrid">
        {items.map((d) => (
          <div key={d.key} className="ring-item" data-m={d.key}>
            <div className="ring-wrap">
              <svg viewBox="0 0 72 72">
                <circle className="bg" cx={36} cy={36} r={30} />
                <circle
                  className="fg"
                  cx={36}
                  cy={36}
                  r={30}
                  style={{ strokeDasharray: `${d.pct} ${RING_C}` }}
                />
              </svg>
              <div className="ring-center">
                <div className="val">{d.val}</div>
                <div className="lbl">{d.lbl}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
