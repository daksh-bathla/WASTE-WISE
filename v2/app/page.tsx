"use client";

import { useRef, useState } from "react";
import type { AnalysisResult } from "@/schemas/analysis";
import { ResultView } from "@/components/ResultView";

type Phase = "idle" | "loading" | "done" | "error";

const STAGES = ["Identifying the item", "Running the safety gate", "Finding safe actions", "Checking Delhi NCR options"];

export default function Home() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [stage, setStage] = useState(0);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function analyze(file: File) {
    setPhase("loading");
    setStage(0);
    setResult(null);
    setError(null);
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

  function reset() {
    setPhase("idle");
    setResult(null);
    setError(null);
    setPreview(null);
  }

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 py-8">
      <header className="mb-6 text-center">
        <h1 className="text-3xl font-black tracking-tight">
          Waste<span className="text-purple">Wise</span>
        </h1>
        <p className="mt-1 text-sm text-muted">
          Snap it → 3 safe, cited actions. Every recommendation is tested against a safety suite.
        </p>
      </header>

      {phase === "idle" && (
        <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-border bg-card p-8 text-center">
          <div className="text-5xl" aria-hidden>
            📸
          </div>
          <p className="text-sm text-muted">Photograph the item you&apos;re about to throw away.</p>
          <button
            onClick={() => fileRef.current?.click()}
            className="rounded-full bg-purple px-6 py-3 font-bold text-white"
          >
            Scan an item
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && analyze(e.target.files[0])}
          />
        </div>
      )}

      {phase === "loading" && (
        <div className="flex flex-col items-center gap-4 rounded-3xl border border-border bg-card p-8">
          {preview && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={preview} alt="scan" className="h-40 w-40 rounded-2xl object-cover" />
          )}
          <ul className="w-full space-y-2 text-sm">
            {STAGES.map((label, i) => (
              <li key={label} className={`flex items-center gap-2 ${i <= stage ? "font-semibold" : "text-muted"}`}>
                <span>{i < stage ? "✓" : i === stage ? "⏳" : "○"}</span>
                {label}
              </li>
            ))}
          </ul>
        </div>
      )}

      {phase === "error" && (
        <div className="rounded-3xl border border-danger/40 bg-danger-soft/40 p-6 text-center">
          <p className="font-semibold text-danger">{error}</p>
          <button onClick={reset} className="mt-4 rounded-full bg-purple px-5 py-2 font-bold text-white">
            Try again
          </button>
        </div>
      )}

      {phase === "done" && result && (
        <>
          {result.needs_clarification ? (
            <div className="rounded-3xl border border-border bg-card p-6 text-center">
              <p className="text-sm text-muted">Not confident enough to answer safely.</p>
              <p className="mt-2 font-semibold">
                {result.identification.clarifying_question || "Can you retake the photo with better light?"}
              </p>
              <button onClick={reset} className="mt-4 rounded-full bg-purple px-5 py-2 font-bold text-white">
                Retake photo
              </button>
            </div>
          ) : (
            <ResultView result={result} />
          )}
          <button onClick={reset} className="mt-6 self-center rounded-full border border-border px-5 py-2 text-sm font-bold">
            Scan another item
          </button>
        </>
      )}

      <footer className="mt-auto pt-8 text-center text-xs text-muted">
        Demo — Delhi NCR facility data is curated and should be verified before use.
      </footer>
    </main>
  );
}
