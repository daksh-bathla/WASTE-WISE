import type { AnalysisResult, Action } from "@/schemas/analysis";

const KIND_LABEL: Record<Action["kind"], string> = {
  reuse: "Reuse",
  pass_on: "Pass on",
  dispose: "Dispose",
};

export function ResultView({ result }: { result: AnalysisResult }) {
  const { identification: id, safety, actions, impact, resale } = result;
  const disposalOnly = safety.length > 0 && safety.every((s) => s.disposal_only);
  const blocked = [...new Set(safety.flatMap((s) => s.blocked_actions))];
  const reasons = [...new Set(safety.flatMap((s) => s.reasons))];

  const sentence = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const meta = [
    sentence(id.category.replace(/_/g, " ")),
    id.condition === "unknown" ? null : sentence(id.condition),
    `${Math.round(id.confidence * 100)}% confidence`,
  ].filter(Boolean);

  return (
    <div>
      {/* ── Identification ─────────────────────────────────────────── */}
      <header className="border-b border-rule pb-7">
        <p className="eyebrow">Identified</p>
        <h2 className="display mt-2 text-[2.75rem] capitalize sm:text-5xl">{id.item}</h2>
        <p className="mt-3 text-[0.8125rem] text-ink-2">{meta.join("  ·  ")}</p>
        {id.hazards.length > 0 && (
          <p className="mt-2 text-[0.8125rem] font-medium text-hazard">
            Hazards — {id.hazards.join(", ")}
          </p>
        )}
      </header>

      {/* ── Safety gate — the load-bearing section ─────────────────── */}
      {(() => {
        const flagged = disposalOnly || blocked.length > 0;
        const verdict = disposalOnly
          ? "Disposal only"
          : blocked.length > 0
            ? "Some uses blocked"
            : "Cleared for reuse";
        return (
          <section
            className={`border-b border-rule py-8 ${
              flagged ? "border-l-2 border-l-hazard pl-5 sm:-ml-5" : ""
            }`}
          >
            <p className={`eyebrow ${flagged ? "text-hazard" : "text-safe"}`}>Safety gate</p>
            <p
              className={`display mt-1.5 text-[1.75rem] leading-none ${
                flagged ? "text-hazard" : ""
              }`}
            >
              {verdict}
            </p>

            {reasons.length > 0 ? (
              <ul className="mt-5 space-y-2">
                {reasons.slice(0, 3).map((r, i) => (
                  <li key={i} className="text-[0.9375rem] leading-relaxed text-ink-2">
                    {r}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-[0.9375rem] leading-relaxed text-ink-2">
                Ordinary reuse routes are open. The suggestions below are still scoped to the
                surfaces this item is safe for.
              </p>
            )}

            {blocked.length > 0 && (
              <div className="mt-6 border border-hazard/30 bg-hazard-bg px-4 py-4">
                <p className="eyebrow text-hazard">Never</p>
                <p className="mt-2 text-[0.9375rem] font-medium leading-relaxed text-hazard">
                  {blocked.join(" · ")}
                </p>
              </div>
            )}
          </section>
        );
      })()}

      {/* ── Actions ────────────────────────────────────────────────── */}
      <section>
        {actions.map((a, i) => (
          <ActionRow key={i} action={a} index={i} />
        ))}
        {actions.length === 0 && (
          <p className="border-b border-rule py-7 text-[0.9375rem] leading-relaxed text-ink-2">
            No safe recommendation could be produced for this item. When in doubt, use your
            municipal hazardous-waste collection.
          </p>
        )}
      </section>

      {/* ── What's it worth ───────────────────────────────────────── */}
      {resale && (
        <section className="border-b border-rule py-7">
          <p className="eyebrow">Worth to you</p>
          {resale.inr_low != null && resale.inr_high != null ? (
            <p className="display tnum mt-3 text-[2rem]">
              {resale.inr_low === resale.inr_high
                ? `≈ ₹${resale.inr_high}`
                : `≈ ₹${resale.inr_low}–${resale.inr_high}`}
            </p>
          ) : (
            <p className="display mt-3 text-[1.5rem] leading-tight">Has resale value</p>
          )}
          <p className="mt-2 max-w-md text-[0.8125rem] leading-relaxed text-ink-3">{resale.basis}</p>
          {resale.channel_url && resale.channel_label && (
            <a
              href={resale.channel_url}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-block text-[0.8125rem] font-semibold underline decoration-rule-strong underline-offset-4 hover:decoration-ink"
            >
              {resale.channel_label} &rarr;
            </a>
          )}
        </section>
      )}

      {/* ── Impact ─────────────────────────────────────────────────── */}
      {impact && (
        <section className="border-b border-rule py-7">
          <p className="eyebrow">If you follow the first action</p>
          <p className="display tnum mt-3 text-[2rem]">
            {impact.kg_diverted} kg diverted
            <span className="text-ink-3"> · </span>
            {(impact.co2e_grams_avoided / 1000).toFixed(2)} kg CO₂e avoided
          </p>
          <p className="mt-1.5 text-[0.8125rem] text-ink-3">{impact.equivalent}</p>
        </section>
      )}

      {result.degraded.length > 0 && (
        <p className="pt-5 text-[0.75rem] leading-relaxed text-ink-3">
          {result.degraded.includes("fixture_identification")
            ? "Preview: identification came from a labelled test fixture, not a photo. "
            : ""}
          {result.degraded.includes("ai_ranking") ? "Actions generated by the rule engine. " : ""}
          {result.degraded.includes("local_options") ? "Local options unavailable." : ""}
        </p>
      )}
    </div>
  );
}

function ActionRow({ action, index }: { action: Action; index: number }) {
  return (
    <article className="border-b border-rule py-7">
      <div className="flex items-baseline gap-4">
        <span className="display tnum shrink-0 text-[1.75rem] text-rule-strong">
          {String(index + 1).padStart(2, "0")}
        </span>
        <div className="min-w-0 flex-1">
          <p className="eyebrow">{KIND_LABEL[action.kind]}</p>
          <h3 className="display mt-1.5 text-[1.625rem] leading-tight">{action.title}</h3>
          <p className="mt-2.5 text-[0.9375rem] leading-relaxed text-ink-2">{action.why}</p>
        </div>
      </div>

      <div className="mt-5 sm:pl-[3.5rem]">
        {action.steps.length > 0 && (
          <ol className="space-y-3">
            {action.steps.map((s, i) => (
              <li key={i} className="flex gap-3.5 text-[0.9375rem] leading-relaxed">
                <span className="tnum shrink-0 pt-px text-[0.75rem] font-semibold text-ink-3">
                  {i + 1}
                </span>
                <span>
                  {s.text}
                  {s.quantity && <span className="text-ink-3"> — {s.quantity}</span>}
                </span>
              </li>
            ))}
          </ol>
        )}

        {action.local.length > 0 && (
          <div className="mt-5 border-t border-rule pt-4">
            <p className="eyebrow">Near you · Delhi NCR</p>
            <ul className="mt-2.5 space-y-2">
              {action.local.slice(0, 3).map((l, i) => (
                <li key={i} className="text-[0.875rem] leading-relaxed">
                  <span className="font-semibold">{l.name}</span>
                  {l.distance_km != null && (
                    <span className="tnum text-ink-3"> · {l.distance_km} km</span>
                  )}
                  <span className="text-ink-3"> — {l.area}</span>
                  {l.url && (
                    <>
                      {" "}
                      <a
                        href={l.url}
                        target="_blank"
                        rel="noreferrer"
                        className="underline decoration-rule-strong underline-offset-2 hover:decoration-ink"
                      >
                        open
                      </a>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-baseline gap-x-6 gap-y-1.5 text-[0.75rem] leading-relaxed">
          <p className="text-hazard">
            <span className="font-semibold">Safety</span> — {action.safety_note}
          </p>
          {action.sources.length > 0 && (
            <p className="text-ink-3">
              <span className="font-semibold">Source</span>{" "}
              {action.sources.map((s, i) => (
                <span key={i}>
                  {i > 0 && ", "}
                  {s.url ? (
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noreferrer"
                      className="underline decoration-rule-strong underline-offset-2 hover:decoration-ink"
                    >
                      {s.label}
                    </a>
                  ) : (
                    s.label
                  )}
                </span>
              ))}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}
