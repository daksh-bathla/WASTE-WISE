const paddingMap = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export default function Card({
  children,
  className = '',
  padding = 'md',
  hoverable = false,
  as: Component = 'div',
  ...props
}) {
  return (
    <Component
      className={`surface-card ${paddingMap[padding] || paddingMap.md} ${hoverable ? 'surface-hover' : ''} ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
}
