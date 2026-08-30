"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { AnalysisResult } from "@/schemas/analysis";
import { ResultView } from "@/components/ResultView";

type Phase = "idle" | "loading" | "done" | "error";
type DemoCase = { id: string; label: string; trap: boolean };

const STAGES = ["Identifying", "Safety gate", "Ranking actions", "Delhi NCR options"];

export default function ScanPage() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [stage, setStage] = useState(0);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [demoCases, setDemoCases] = useState<DemoCase[]>([]);
  const [demoOpen, setDemoOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Dev-only: the fixture preview endpoint 404s in production.
  useEffect(() => {
    fetch("/api/analyze")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.cases && setDemoCases(d.cases))
      .catch(() => {});
  }, []);

  function begin() {
    setPhase("loading");
    setStage(0);
    setResult(null);
    setError(null);
  }

  async function analyze(file: File) {
    begin();
    setPreview(URL.createObjectURL(file));
    const ticker = setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), 1400);
    try {
      const body = new FormData();
      body.append("image", file);
      const res = await fetch("/api/analyze", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed");
      setResult(data as AnalysisResult);
      setPhase("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setPhase("error");
    } finally {
      clearInterval(ticker);
    }
  }

  async function runDemo(id: string) {
    begin();
    setPreview(null);
    try {
      const res = await fetch(`/api/analyze?demo=${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Preview failed");
      setResult(data as AnalysisResult);
      setPhase("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setPhase("error");
    }
  }

  function reset() {
    setPhase("idle");
    setResult(null);
    setError(null);
    setPreview(null);
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 sm:px-10">
      <header className="flex items-baseline justify-between border-b border-rule py-6">
        <Link href="/" className="display text-[1.375rem] tracking-tight">
          WasteWise
        </Link>
        <span className="eyebrow">Delhi NCR</span>
      </header>

      <main className="flex-1 py-10">
        {phase === "idle" && (
          <>
            <h1 className="display text-[2.25rem] sm:text-[2.75rem]">Scan an item</h1>
            <p className="mt-3 max-w-md text-[0.9375rem] leading-relaxed text-ink-2">
              Photograph what you are about to throw away. Three actions come back, each
              scoped to what the item is safe for.
            </p>

            <button
              onClick={() => fileRef.current?.click()}
              className="mt-8 bg-ink px-8 py-4 text-[0.875rem] font-semibold tracking-wide text-paper transition-opacity hover:opacity-85"
            >
              Photograph an item
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && analyze(e.target.files[0])}
            />

            {demoCases.length > 0 && (
              <section className="mt-14 border-t border-rule pt-6">
                <button
                  onClick={() => setDemoOpen((o) => !o)}
                  className="flex w-full items-baseline justify-between text-left"
                >
                  <span className="eyebrow">Dev preview — run without a photo</span>
                  <span className="text-[0.75rem] text-ink-3">{demoOpen ? "hide" : "show"}</span>
                </button>
                {demoOpen && (
                  <>
                    <p className="mt-3 text-[0.8125rem] leading-relaxed text-ink-3">
                      Runs the real pipeline from a labelled test fixture. Safety gate, ranking,
                      local options and impact are live — only identification is skipped.
                    </p>
                    <ul className="mt-4">
                      {demoCases.map((c) => (
                        <li key={c.id} className="border-b border-rule last:border-0">
                          <button
                            onClick={() => runDemo(c.id)}
                            className="flex w-full items-baseline justify-between gap-4 py-2.5 text-left text-[0.875rem] transition-opacity hover:opacity-60"
                          >
                            <span>{c.label}</span>
                            {c.trap && (
                              <span className="eyebrow shrink-0 text-hazard">Hazard</span>
                            )}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </section>
            )}
          </>
        )}

        {phase === "loading" && (
          <div className="flex flex-col items-start gap-8">
            {preview && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={preview} alt="" className="h-44 w-44 object-cover grayscale" />
            )}
            <ol className="w-full">
              {STAGES.map((label, i) => (
                <li
                  key={label}
                  className={`flex items-baseline justify-between border-b border-rule py-3.5 text-[0.9375rem] ${
                    i <= stage ? "text-ink" : "text-ink-3"
                  }`}
                >
                  <span>{label}</span>
                  <span className="eyebrow">
                    {i < stage ? "done" : i === stage ? "running" : ""}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {phase === "error" && (
          <div>
            <p className="eyebrow text-hazard">Could not analyse</p>
            <p className="display mt-2 text-[1.75rem]">{error}</p>
            <button
              onClick={reset}
              className="mt-7 bg-ink px-7 py-3.5 text-[0.875rem] font-semibold tracking-wide text-paper transition-opacity hover:opacity-85"
            >
              Try again
            </button>
          </div>
        )}

        {phase === "done" && result && (
          <>
            {result.needs_clarification ? (
              <div>
                <p className="eyebrow">Not confident enough to answer</p>
                <p className="display mt-3 text-[1.75rem] leading-snug">
                  {result.identification.clarifying_question ||
                    "Retake the photo with better light."}
                </p>
                <p className="mt-4 max-w-md text-[0.9375rem] leading-relaxed text-ink-2">
                  Guessing here risks an unsafe answer, so it asks instead.
                </p>
                <button
                  onClick={reset}
                  className="mt-7 bg-ink px-7 py-3.5 text-[0.875rem] font-semibold tracking-wide text-paper transition-opacity hover:opacity-85"
                >
                  Retake photo
                </button>
              </div>
            ) : (
              <ResultView result={result} />
            )}
            <button
              onClick={reset}
              className="mt-8 border border-rule-strong px-7 py-3.5 text-[0.875rem] font-semibold tracking-wide transition-colors hover:bg-surface"
            >
              Scan another item
            </button>
          </>
        )}
      </main>

      <footer className="border-t border-rule py-6 text-[0.75rem] leading-relaxed text-ink-3">
        Delhi NCR facility data is curated for this demo — verify before relying on it.
      </footer>
    </div>
  );
}
