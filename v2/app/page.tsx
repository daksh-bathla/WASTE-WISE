import Link from "next/link";
import { getSafetyStats } from "@/lib/safety-stats";
import { PipelineDiagram } from "@/components/PipelineDiagram";

export const dynamic = "force-dynamic";

export default async function Landing() {
  const { headline, ruleCount } = await getSafetyStats();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 sm:px-10">
      <header className="flex items-baseline justify-between border-b border-rule py-6">
        <span className="display text-[1.375rem] tracking-tight">WasteWise</span>
        <span className="eyebrow">Delhi NCR</span>
      </header>

      <main className="flex-1">
        {/* hero */}
        <section className="border-b border-rule py-14 sm:py-20">
          <h1 className="display max-w-xl text-[2rem] leading-tight sm:text-[2.75rem]">
            &ldquo;Which bin?&rdquo; is the easy question. Nobody checks whether the answer
            is safe.
          </h1>
          <p className="mt-6 max-w-md text-[0.9375rem] leading-relaxed text-ink-2">
            Photograph anything you are about to throw away. WasteWise returns three
            specific, cited actions &mdash; reuse, pass on, dispose &mdash; each one run past
            a hazard rulebook the model is not allowed to overrule.
          </p>
          <Link
            href="/scan"
            className="mt-9 inline-block bg-ink px-8 py-4 text-[0.875rem] font-semibold tracking-wide text-paper transition-opacity hover:opacity-85"
          >
            Scan an item
          </Link>
        </section>

        {/* the problem */}
        <section className="border-b border-rule py-12">
          <p className="eyebrow">The problem</p>
          <p className="mt-4 max-w-lg text-[1.0625rem] leading-relaxed">
            Expired medicine goes in the compost. A swollen lithium cell goes in the kitchen
            bin. Avocado skin gets fed to the chickens. The wrong call is common, and a few of
            the wrong calls start fires or poison animals. An AI that answers fast and
            confidently makes this worse, not better &mdash; unless something is checking it.
          </p>
        </section>

        {/* the pipeline */}
        <section className="border-b border-rule py-12">
          <p className="eyebrow">What runs on your photo</p>
          <div className="mt-6">
            <PipelineDiagram />
          </div>
        </section>

        {/* the proof */}
        <section className="border-b border-rule py-12">
          <p className="eyebrow">The proof</p>
          <p className="mt-4 max-w-lg text-[0.9375rem] leading-relaxed text-ink-2">
            {ruleCount} deterministic rules, and a suite that runs the whole pipeline against
            known-correct answers on every change. Weaken a rule and the build turns red.
          </p>
          <dl className="mt-8 grid grid-cols-3 gap-6">
            <div>
              <dt className="display tnum text-[2.5rem] leading-none">{headline.cases}</dt>
              <dd className="eyebrow mt-2">tested cases</dd>
            </div>
            <div>
              <dt className="display tnum text-[2.5rem] leading-none">{headline.traps}</dt>
              <dd className="eyebrow mt-2">hazard traps</dd>
            </div>
            <div>
              <dt
                className={`display tnum text-[2.5rem] leading-none ${headline.leaks > 0 ? "text-hazard" : ""}`}
              >
                {headline.leaks}
              </dt>
              <dd className={`eyebrow mt-2 ${headline.leaks > 0 ? "text-hazard" : ""}`}>
                safety leaks
              </dd>
            </div>
          </dl>
          <Link
            href="/safety"
            className="mt-7 inline-block text-[0.875rem] font-semibold underline decoration-rule-strong underline-offset-4 hover:decoration-ink"
          >
            See the full suite &rarr;
          </Link>
        </section>
      </main>

      <footer className="flex flex-wrap items-baseline gap-x-6 gap-y-2 border-t border-rule py-6 text-[0.75rem] leading-relaxed text-ink-3">
        <Link href="/safety" className="underline decoration-rule-strong underline-offset-2 hover:decoration-ink">
          Safety suite
        </Link>
        <a
          href="https://github.com/tarangkhandelwal622-cpu/WASTE-WISE/pull/1"
          target="_blank"
          rel="noreferrer"
          className="underline decoration-rule-strong underline-offset-2 hover:decoration-ink"
        >
          Source
        </a>
        <span>Delhi NCR facility data is curated for this demo &mdash; verify before relying on it.</span>
      </footer>
    </div>
  );
}
