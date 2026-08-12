import Button from './Button';

/**
 * Reusable empty state component.
 *
 * Props:
 *  - icon: React component (e.g., an SVG icon from lucide-react)
 *  - title: Heading text
 *  - description: Supporting paragraph
 *  - actionLabel (optional): Text for CTA button
 *  - onAction (optional): Callback when CTA button is clicked
 */
export default function EmptyState({ icon: Icon, title, description, actionLabel, onAction }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12 text-center max-w-md mx-auto">
      {Icon && (
        <div className="flex items-center justify-center w-20 h-20 rounded-full bg-light-green text-deep-green">
          <Icon size={32} className="stroke-2" />
        </div>
      )}
      <h2 className="text-2xl font-bold text-text-primary">{title}</h2>
      <p className="text-text-muted max-w-sm">{description}</p>
      {actionLabel && onAction && (
        <Button variant="primary" onClick={onAction} className="mt-3">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
