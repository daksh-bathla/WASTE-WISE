/**
 * The analysis pipeline, as one figure. Deterministic stages are solid;
 * the two LLM stages are outlined. The safety gate is the emphasised node —
 * it is the one stage the model cannot talk its way past.
 */
const STAGES = [
  { label: "Identify", kind: "llm" },
  { label: "Decompose", kind: "det" },
  { label: "Safety gate", kind: "gate" },
  { label: "Retrieve", kind: "det" },
  { label: "Rank", kind: "llm" },
  { label: "Impact", kind: "det" },
] as const;

export function PipelineDiagram() {
  const W = 118;
  const GAP = 14;
  const H = 56;
  const totalW = STAGES.length * W + (STAGES.length - 1) * GAP;

  return (
    <figure className="not-prose">
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${totalW} ${H + 34}`}
          width={totalW}
          height={H + 34}
          role="img"
          aria-label="Pipeline: identify, decompose, safety gate, retrieve, rank, impact. Identify and rank use an LLM; the safety gate is deterministic and cannot be overridden."
          className="max-w-none"
        >
          {STAGES.map((s, i) => {
            const x = i * (W + GAP);
            const isGate = s.kind === "gate";
            const isLlm = s.kind === "llm";
            return (
              <g key={s.label}>
                {i > 0 && (
                  <line
                    x1={x - GAP}
                    y1={H / 2}
                    x2={x}
                    y2={H / 2}
                    stroke="var(--rule-strong)"
                    strokeWidth={1}
                  />
                )}
                <rect
                  x={x}
                  y={isGate ? 0 : 6}
                  width={W}
                  height={isGate ? H : H - 12}
                  fill={isGate ? "var(--hazard-bg)" : isLlm ? "transparent" : "var(--surface)"}
                  stroke={isGate ? "var(--hazard)" : "var(--rule-strong)"}
                  strokeWidth={isGate ? 1.5 : 1}
                  strokeDasharray={isLlm ? "3 3" : undefined}
                />
                <text
                  x={x + W / 2}
                  y={H / 2 + 1}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={12}
                  fontWeight={isGate ? 600 : 500}
                  fill={isGate ? "var(--hazard)" : "var(--ink)"}
                >
                  {s.label}
                </text>
                <text
                  x={x + W / 2}
                  y={H + 20}
                  textAnchor="middle"
                  fontSize={8.5}
                  letterSpacing={1.4}
                  fill="var(--ink-3)"
                >
                  {isGate ? "CANNOT OVERRIDE" : isLlm ? "LLM" : "DETERMINISTIC"}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <figcaption className="mt-3 text-[0.75rem] leading-relaxed text-ink-3">
        Dashed = the model. Solid = code. The gate sits between them, and the merge does not
        land if the suite says the gate leaked.
      </figcaption>
    </figure>
  );
}
