import { readFileSync } from "node:fs";
import { join } from "node:path";
import Link from "next/link";
import type { Metadata } from "next";
import { getSafetyStats, type CaseRow } from "@/lib/safety-stats";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "WasteWise — the safety suite",
  description:
    "Every recommendation WasteWise makes is checked against a deterministic rulebook the model cannot overrule, and that rulebook is tested on every change.",
};

function weakenedRuleDemo(): string {
  try {
    return readFileSync(join(process.cwd(), "eval", "weakened-rule-demo.txt"), "utf8");
  } catch {
    return "";
  }
}

export default async function SafetyPage() {
  const stats = await getSafetyStats();
  const demo = weakenedRuleDemo();
  const clean = stats.leaks === 0 && stats.allTrapsPass;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 sm:px-10">
      <header className="flex items-baseline justify-between border-b border-rule py-6">
        <Link href="/" className="display text-[1.375rem] tracking-tight">
          WasteWise
        </Link>
        <span className="eyebrow">The safety suite</span>
      </header>

      <main className="flex-1 py-10">
        <h1 className="display max-w-lg text-[2.75rem] sm:text-[3.25rem]">
          The model proposes. The rulebook decides.
        </h1>
        <p className="mt-5 max-w-md text-[0.9375rem] leading-relaxed text-ink-2">
          {stats.ruleCount} deterministic hazard rules sit between the AI and you. The AI can
          explain a block, never lift one. This page is the suite that proves it — run live,
          right now, on this request.
        </p>

        {/* headline triple */}
        <dl className="mt-10 grid grid-cols-3 gap-6 border-y border-rule py-8">
          <Stat n={stats.headline.cases} label="tested cases" />
          <Stat n={stats.headline.traps} label="hazard traps" />
          <Stat
            n={stats.headline.leaks}
            label="safety leaks"
            hazard={stats.headline.leaks > 0}
          />
        </dl>

        {!clean && (
          <p className="mt-4 text-[0.875rem] font-medium leading-relaxed text-hazard">
            {stats.leaks > 0
              ? `${stats.leaks} case${stats.leaks === 1 ? "" : "s"} leaked a blocked action into the output.`
              : `${stats.traps - stats.trapsPassed} trap case${stats.traps - stats.trapsPassed === 1 ? "" : "s"} did not fully block. `}
            The build is red until this is fixed.
          </p>
        )}

        {/* method */}
        <section className="mt-10">
          <p className="eyebrow">How it works</p>
          <p className="mt-3 max-w-lg text-[0.9375rem] leading-relaxed text-ink-2">
            Each case is a real item with a known-correct answer: the category it belongs to,
            the actions that must never be recommended, and the surfaces (skin, food, animal,
            plant, craft) it is safe for. The full pipeline runs; the result is scored against
            that answer. A trap case that lets a blocked action through fails the case, and any
            failed trap fails the whole suite in CI — the merge does not land.
          </p>
        </section>

        {/* the demo */}
        {demo && (
          <section className="mt-10">
            <p className="eyebrow">What happens when a rule is weakened</p>
            <p className="mt-3 max-w-lg text-[0.9375rem] leading-relaxed text-ink-2">
              Disable the lithium-battery rule and the suite catches it on the next run:
            </p>
            <pre className="mt-4 overflow-x-auto rounded-none border border-rule bg-surface p-4 text-[0.75rem] leading-relaxed text-ink-2">
              <code>{demo}</code>
            </pre>
          </section>
        )}

        {/* the table */}
        <section className="mt-12">
          <div className="flex items-baseline justify-between border-b border-rule pb-2">
            <p className="eyebrow">Every case, this run</p>
            <p className="eyebrow tnum">
              {stats.passed}/{stats.total} pass
              {stats.visionCases > 0 ? ` · ${stats.visionCases} live vision` : ""}
            </p>
          </div>
          <ul>
            {stats.rows.map((row) => (
              <CaseLine key={row.id} row={row} />
            ))}
          </ul>
        </section>

        <div className="mt-12 border-t border-rule pt-6">
          <Link
            href="/scan"
            className="inline-block bg-ink px-7 py-3.5 text-[0.875rem] font-semibold tracking-wide text-paper transition-opacity hover:opacity-85"
          >
            Try it on something
          </Link>
        </div>
      </main>

      <footer className="border-t border-rule py-6 text-[0.75rem] leading-relaxed text-ink-3">
        The suite runs on every pull request. Source:{" "}
        <a
          href="https://github.com/tarangkhandelwal622-cpu/WASTE-WISE/pull/1"
          target="_blank"
          rel="noreferrer"
          className="underline decoration-rule-strong underline-offset-2 hover:decoration-ink"
        >
          the PR
        </a>
        .
      </footer>
    </div>
  );
}

function Stat({ n, label, hazard = false }: { n: number; label: string; hazard?: boolean }) {
  return (
    <div>
      <dt className={`display tnum text-[2.5rem] leading-none ${hazard ? "text-hazard" : ""}`}>{n}</dt>
      <dd className={`eyebrow mt-2 ${hazard ? "text-hazard" : ""}`}>{label}</dd>
    </div>
  );
}

function CaseLine({ row }: { row: CaseRow }) {
  return (
    <li className="border-b border-rule py-3 last:border-0">
      <div className="flex items-baseline justify-between gap-4">
        <div className="min-w-0">
          <span className="text-[0.9375rem]">{row.label}</span>
          {row.trap && <span className="eyebrow ml-3 text-hazard">Hazard</span>}
          {row.mode === "vision" && <span className="eyebrow ml-2 text-ink-3">live vision</span>}
        </div>
        <span
          className={`eyebrow shrink-0 ${row.pass ? "text-safe" : "text-hazard"}`}
        >
          {row.pass ? "Pass" : "Fail"}
        </span>
      </div>
      {row.expectedBlockedActions.length > 0 && (
        <p className="mt-1 text-[0.75rem] leading-relaxed text-ink-3">
          must block: {row.expectedBlockedActions.join(" · ")}
        </p>
      )}
      {!row.pass && row.failures.length > 0 && (
        <p className="mt-1 text-[0.75rem] leading-relaxed text-hazard">{row.failures.join("; ")}</p>
      )}
    </li>
  );
}
