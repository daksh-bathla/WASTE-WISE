import LoadingSpinner from './LoadingSpinner';

const variants = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  success: 'btn-success',
  white: 'btn-white',
  ghost: 'btn-ghost',
  danger: 'bg-[#E76F51] text-white hover:bg-[#c95539]',
};

const sizes = {
  sm: 'btn-sm',
  md: 'btn-md',
  lg: 'btn-lg',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  type = 'button',
  onClick,
  children,
  className = '',
  ...props
}) {
  return (
    <button
      type={type}
      className={`btn ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}`}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {loading && <LoadingSpinner size="sm" />}
      {loading ? 'Please wait' : children}
    </button>
  );
}
