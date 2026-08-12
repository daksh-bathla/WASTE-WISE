const sizeMap = {
  sm: 'spinner-sm',
  md: 'spinner-md',
  lg: 'spinner-lg',
};

export default function LoadingSpinner({ size = 'md', className = '' }) {
  return <span className={`spinner ${sizeMap[size] || sizeMap.md} ${className}`} aria-hidden="true" />;
}
