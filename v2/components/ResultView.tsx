import type { AnalysisResult, Action } from "@/schemas/analysis";

const KIND_META: Record<Action["kind"], { label: string; tone: string }> = {
  reuse: { label: "Reuse", tone: "bg-green-soft text-green" },
  pass_on: { label: "Pass On", tone: "bg-purple-soft text-purple" },
  dispose: { label: "Dispose", tone: "bg-danger-soft text-danger" },
};

export function ResultView({ result }: { result: AnalysisResult }) {
  const { identification: id, safety, actions, impact } = result;
  const disposalOnly = safety.length > 0 && safety.every((s) => s.disposal_only);
  const allBlocked = [...new Set(safety.flatMap((s) => s.blocked_actions))];

  return (
    <div className="flex flex-col gap-5">
      {/* identification */}
      <section className="rounded-3xl border border-border bg-card p-5">
        <p className="text-xs font-bold uppercase tracking-widest text-muted">Identified</p>
        <h2 className="mt-1 text-2xl font-extrabold capitalize">{id.item}</h2>
        <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold">
          <span className="rounded-full bg-purple-soft px-2.5 py-1 text-purple capitalize">{id.category.replace(/_/g, " ")}</span>
          <span className="rounded-full bg-purple-soft px-2.5 py-1 text-purple capitalize">{id.condition}</span>
          <span className="rounded-full bg-purple-soft px-2.5 py-1 text-purple">{Math.round(id.confidence * 100)}% sure</span>
          {id.hazards.map((h) => (
            <span key={h} className="rounded-full bg-danger-soft px-2.5 py-1 text-danger capitalize">⚠ {h}</span>
          ))}
        </div>
      </section>

      {/* safety gate */}
      <section className={`rounded-3xl border p-5 ${disposalOnly ? "border-danger/40 bg-danger-soft/40" : "border-border bg-card"}`}>
        <div className="flex items-center gap-2">
          <span aria-hidden>🛡️</span>
          <h3 className="text-sm font-extrabold uppercase tracking-wide">
            Safety gate {disposalOnly && <span className="text-danger">— disposal only</span>}
          </h3>
        </div>
        <ul className="mt-2 space-y-1.5 text-sm text-muted">
          {safety.flatMap((s) => s.reasons).slice(0, 3).map((r, i) => (
            <li key={i}>• {r}</li>
          ))}
          {safety.every((s) => s.reasons.length === 0) && <li>• No hazards detected — normal reuse options apply.</li>}
        </ul>
        {allBlocked.length > 0 && (
          <p className="mt-3 text-xs font-semibold text-danger">
            Never: {allBlocked.slice(0, 6).join(" · ")}
          </p>
        )}
      </section>

      {/* actions */}
      <section className="flex flex-col gap-3">
        {actions.map((a, i) => (
          <ActionCard key={i} action={a} />
        ))}
        {actions.length === 0 && (
          <p className="rounded-3xl border border-border bg-card p-5 text-sm text-muted">
            No safe recommendation could be produced for this item. When in doubt, use your municipal
            hazardous-waste collection.
          </p>
        )}
      </section>

      {/* impact */}
      {impact && (
        <section className="rounded-3xl border border-green/30 bg-green-soft/50 p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-green">If you follow the top action</p>
          <p className="mt-1 text-lg font-extrabold">
            {impact.kg_diverted} kg diverted · {(impact.co2e_grams_avoided / 1000).toFixed(2)} kg CO₂e avoided
          </p>
          <p className="text-sm text-muted">{impact.equivalent}</p>
        </section>
      )}

      {result.degraded.length > 0 && (
        <p className="text-center text-xs text-muted">
          Showing {result.degraded.includes("ai_ranking") ? "rule-based" : "partial"} guidance
          {result.degraded.includes("local_options") ? " — local options unavailable" : ""}.
        </p>
      )}
    </div>
  );
}

function ActionCard({ action }: { action: Action }) {
  const meta = KIND_META[action.kind];
  return (
    <article className="rounded-3xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg font-extrabold">{action.title}</h3>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${meta.tone}`}>{meta.label}</span>
      </div>
      <p className="mt-1 text-sm text-muted">{action.why}</p>

      {action.steps.length > 0 && (
        <ol className="mt-3 space-y-1.5 text-sm">
          {action.steps.map((s, i) => (
            <li key={i} className="flex gap-2">
              <span className="font-bold text-purple">{i + 1}.</span>
              <span>
                {s.text}
                {s.quantity && <span className="text-muted"> ({s.quantity})</span>}
              </span>
            </li>
          ))}
        </ol>
      )}

      {action.local.length > 0 && (
        <div className="mt-3 rounded-2xl bg-purple-soft/60 p-3 text-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-purple">Near you (Delhi NCR)</p>
          <ul className="mt-1 space-y-1">
            {action.local.slice(0, 3).map((l, i) => (
              <li key={i}>
                <span className="font-semibold">{l.name}</span>
                {l.distance_km != null && <span className="text-muted"> · {l.distance_km} km</span>}
                <span className="text-muted"> — {l.area}</span>
                {l.url && (
                  <>
                    {" "}
                    <a href={l.url} target="_blank" rel="noreferrer" className="text-purple underline">
                      link
                    </a>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-3 text-xs font-semibold text-danger">Safety: {action.safety_note}</p>

      {action.sources.length > 0 && (
        <p className="mt-2 text-xs text-muted">
          Source:{" "}
          {action.sources.map((s, i) => (
            <span key={i}>
              {i > 0 && ", "}
              {s.url ? (
                <a href={s.url} target="_blank" rel="noreferrer" className="underline">
                  {s.label}
                </a>
              ) : (
                s.label
              )}
            </span>
          ))}
        </p>
      )}
    </article>
  );
}
