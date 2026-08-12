import { AlertTriangle } from 'lucide-react';
import Button from './Button';
import Modal from './Modal';

export default function ConfirmDialog({
  isOpen,
  onConfirm,
  onCancel,
  title = 'Confirm action',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'warning',
}) {
  const colorClass = type === 'danger' ? 'text-danger bg-[#FFF0EE]' : 'text-warning bg-[#FFF5EE]';

  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={title} size="sm">
      <div className="flex gap-4">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${colorClass}`}>
          <AlertTriangle size={22} />
        </div>
        <div>
          <p className="mb-6 leading-7">{message}</p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={onCancel}>
              {cancelText}
            </Button>
            <Button variant={type === 'danger' ? 'danger' : 'primary'} onClick={onConfirm}>
              {confirmText}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
