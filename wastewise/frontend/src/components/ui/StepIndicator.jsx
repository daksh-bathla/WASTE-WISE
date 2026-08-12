import { Check } from 'lucide-react';

export default function StepIndicator({ currentStep = 1, totalSteps = 4, labels = [] }) {
  return (
    <div className="my-8 grid gap-3" style={{ gridTemplateColumns: `repeat(${totalSteps}, minmax(0, 1fr))` }}>
      {Array.from({ length: totalSteps }).map((_, index) => {
        const step = index + 1;
        const completed = step < currentStep;
        const active = step === currentStep;

        return (
          <div key={step} className="flex min-w-0 flex-col items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-bold transition ${
                completed
                  ? 'border-deep-green bg-deep-green text-white'
                  : active
                    ? 'border-deep-purple bg-deep-purple text-white'
                    : 'border-border bg-white text-text-muted'
              }`}
            >
              {completed ? <Check size={15} /> : step}
            </div>
            {labels[index] && (
              <span className={`truncate text-xs font-bold ${active ? 'text-deep-purple' : 'text-text-muted'}`}>
                {labels[index]}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
