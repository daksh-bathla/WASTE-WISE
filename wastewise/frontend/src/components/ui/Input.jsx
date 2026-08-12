import { useId, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export default function Input({
  label,
  placeholder,
  type = 'text',
  error,
  leftIcon,
  value,
  onChange,
  disabled = false,
  className = '',
  inputClassName = '',
  ...props
}) {
  const [showPassword, setShowPassword] = useState(false);
  const generatedId = useId();
  const inputId = props.id || generatedId;
  const isPassword = type === 'password';

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label className="input-label" htmlFor={inputId}>
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
            {leftIcon}
          </div>
        )}
        <input
          id={inputId}
          type={isPassword && showPassword ? 'text' : type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          disabled={disabled}
          className={`input-field ${leftIcon ? 'pl-10' : ''} ${isPassword ? 'pr-12' : ''} ${error ? 'error' : ''} ${inputClassName}`}
          aria-invalid={Boolean(error)}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            className="icon-button absolute right-2 top-1/2 h-8 w-8 -translate-y-1/2 rounded-lg"
            onClick={() => setShowPassword((current) => !current)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
      {error && <span className="input-error">{error}</span>}
    </div>
  );
}
