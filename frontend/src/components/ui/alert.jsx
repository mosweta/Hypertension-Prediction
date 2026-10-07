export function Alert({ children, type = 'info', className }) {
  const bgColor = type === 'error' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800';
  return <div className={`p-3 rounded-md ${bgColor} ${className}`}>{children}</div>;
}
