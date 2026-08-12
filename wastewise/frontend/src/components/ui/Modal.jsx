import { useEffect } from 'react';
import { X } from 'lucide-react';

const sizeMap = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export default function Modal({ isOpen, onClose, title, children, size = 'md' }) {
  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKey = (event) => {
      if (event.key === 'Escape') onClose?.();
    };

    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#1A1A2E]/35 p-4 backdrop-blur-sm">
      <div className={`surface-card max-h-[90vh] w-full overflow-auto p-6 shadow-hover ${sizeMap[size] || sizeMap.md}`}>
        <div className="mb-5 flex items-start justify-between gap-4">
          <h2 className="text-2xl">{title}</h2>
          <button type="button" onClick={onClose} className="icon-button shrink-0" aria-label="Close modal">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
