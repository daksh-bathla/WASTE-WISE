export default function ProgressBar({ percentage = 0, animated = false, label }) {
  const safePercentage = Math.max(0, Math.min(Number(percentage) || 0, 100));

  return (
    <div className="w-full">
      {label && (
        <div className="mb-2 flex items-center justify-between text-xs font-bold text-text-secondary">
          <span>{label}</span>
          <span>{safePercentage}%</span>
        </div>
      )}
      <div className="progress-track" aria-label={label || 'Progress'} aria-valuenow={safePercentage} role="progressbar">
        <div
          className={`progress-fill ${animated ? 'animate-pulse' : ''}`}
          style={{ width: `${safePercentage}%` }}
        />
      </div>
    </div>
  );
}
