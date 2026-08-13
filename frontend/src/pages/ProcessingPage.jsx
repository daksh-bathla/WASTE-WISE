/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Leaf, Search, ShieldCheck, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import AppLayout from '../components/AppLayout';
import { Button, Card, LoadingSpinner, ProgressBar } from '../components/ui';
import { scanApi, suggestionsApi, buildScanPayload, buildContextualAnswers } from '../utils/backendApi';
import { useProfileStore } from '../store/authStore';

const processingSteps = [
  { icon: Search, label: 'Reading item details', description: 'Identifying category, condition, date, and visible material clues.' },
  { icon: Leaf, label: 'Separating components', description: 'Breaking the item into parts so each one gets its own pathway.' },
  { icon: ShieldCheck, label: 'Checking safety boundaries', description: 'Filtering unsafe consumption, sensitive skin uses, and animal risks.' },
  { icon: Sparkles, label: 'Finding the best uses', description: 'Ranking practical reuse, compost, donation, repair, resale, and disposal options.' },
];

export default function ProcessingPage() {
  const [progress, setProgress] = useState(8);
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0); // State to trigger re-run on retry
  const location = useLocation();
  const navigate = useNavigate();
  const profile = useProfileStore((state) => state.profile);

  const scanType = location.state?.scanType || 'expired_product';
  const itemName = location.state?.itemName || 'your item';
  const form = location.state?.form || {};

  useEffect(() => {
    // This will re-run when retryCount changes (on retry)
    let isMounted = true;

    const runPipeline = async () => {
      let scanId = null; // Hoisted so catch block can use it for recovery
      try {
        // Step 1 — Build payload and call scan API
        setCurrentStep(0);
        setProgress(15);

        const photoFile = location.state?.photoFile || null;
        const visionData = location.state?.visionData || null;
        const payload = buildScanPayload(scanType, form, profile || {}, photoFile, visionData);
        const scanResult = await scanApi.analyse(payload);
        scanId = scanResult.scanId;

        setCurrentStep(1);
        setProgress(40);

        // Step 2 — Generate suggestions
        setCurrentStep(2);
        setProgress(55);

        const contextual = buildContextualAnswers(profile || {}, form, scanType);
        await suggestionsApi.generate({
          scan_id: scanId,
          selected_goals: ['all'],
          contextual_answers: contextual,
        });

        setCurrentStep(3);
        setProgress(85);

        // Brief pause so the user sees the final step
        await new Promise((resolve) => setTimeout(resolve, 600));
        setProgress(100);

        await new Promise((resolve) => setTimeout(resolve, 400));

        // Show verified reuse ideas first; e-waste repair/recycle pathways are linked from results.
        navigate(`/results/${scanId}`, { replace: true, state: { ...location.state, scanId } });
      } catch (err) {
        console.error('Processing pipeline error:', err);
        if (isMounted) {
          // If we managed to get a scanId from the scan step, navigate to results anyway —
          // the suggestions controller will have written dataset/heuristic fallback suggestions.
          // The error likely happened during suggestion generation (AI timeout, rate limit),
          // not during the scan itself.
          const recoveredScanId = scanId || err?.payload?.scanId || location.state?.scanId;
          if (recoveredScanId) {
            console.log(`[ProcessingPage] Recovered scanId ${recoveredScanId}, navigating to results`);
            toast('Using verified dataset suggestions — AI was temporarily unavailable', {
              icon: '📋',
              duration: 4000,
            });
            navigate(`/results/${recoveredScanId}`, { replace: true, state: { ...location.state, scanId: recoveredScanId } });
            return;
          }

          // Truly unrecoverable — no scanId at all (network down, DB unreachable)
          setError(err.payload?.details || err.message || 'Something went wrong during analysis');
          toast.error('Could not reach the server — please check your connection and retry');
        }
      }
    };

    runPipeline();
    
    return () => {
      isMounted = false;
    };
  }, [scanType, form, profile, navigate, location.state, retryCount]); // Added retryCount dependency

  if (error) {
    return (
      <AppLayout>
        <div className="page-shell flex min-h-[calc(100vh-152px)] items-center justify-center py-12">
          <Card className="w-full max-w-xl p-7 text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-[28px] bg-[#FFF0EE] text-danger">
              <AlertTriangle size={30} />
            </div>
            <h2 className="text-3xl">Analysis could not complete</h2>
            <p className="mt-4 leading-7">{error}</p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button variant="secondary" onClick={() => navigate('/scan')}>Change item</Button>
              <Button
                variant="primary"
                onClick={() => {
                  setError(null);
                  setProgress(8);
                  setCurrentStep(0);
                  setRetryCount(prev => prev + 1); // Trigger re-run of useEffect
                }}
              >
                Retry analysis
              </Button>
            </div>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="page-shell flex min-h-[calc(100vh-152px)] items-center justify-center py-12">
        <Card className="w-full max-w-3xl p-7 sm:p-9">
          <div className="mx-auto mb-7 flex h-20 w-20 items-center justify-center rounded-[28px] bg-light-purple text-deep-purple">
            <LoadingSpinner size="lg" />
          </div>
          <div className="mx-auto max-w-2xl text-center">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-deep-purple">Analysing your item</p>
            <h1 className="text-[clamp(2rem,5vw,3.4rem)]">Finding safe uses for {itemName}</h1>
            <p className="mt-4 text-base leading-7">
              WasteWise is checking components, context, and safety before showing anything you might try.
            </p>
          </div>

          <div className="mt-9">
            <ProgressBar percentage={progress} label="Analysis progress" animated />
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {processingSteps.map(({ icon: Icon, label, description }, index) => {
              const complete = index < currentStep;
              const active = index === currentStep;
              return (
                <div key={label} className={`rounded-2xl border p-4 ${active ? 'border-deep-purple bg-light-purple' : 'border-border bg-[var(--card-bg)]'}`}>
                  <div className="mb-3 flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${complete ? 'bg-light-green text-deep-green' : active ? 'bg-deep-purple text-white' : 'bg-light-purple text-deep-purple'}`}>
                      {complete ? <CheckCircle2 size={20} /> : <Icon size={20} />}
                    </div>
                    <h3 className="text-base">{label}</h3>
                  </div>
                  <p className="text-sm leading-6">{description}</p>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
