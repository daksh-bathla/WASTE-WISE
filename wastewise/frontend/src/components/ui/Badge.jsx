const colorMap = {
  purple: 'badge-purple',
  green: 'badge-green',
  warning: 'badge-warning',
  danger: 'badge-danger',
  neutral: 'badge-neutral',
};

const sizeMap = {
  sm: 'px-2.5 py-1 text-[11px]',
  md: '',
  lg: 'px-4 py-2 text-sm',
};

export default function Badge({
  color = 'purple',
  text,
  children,
  size = 'md',
  className = '',
}) {
  return (
    <span className={`badge ${colorMap[color] || colorMap.purple} ${sizeMap[size] || ''} ${className}`}>
      {children || text}
    </span>
  );
}
