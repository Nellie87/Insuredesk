export default function PageShell({ children, className = '', narrow = false }) {
  return (
    <div
      className={`mx-auto w-full space-y-4 p-4 pb-8 sm:p-6 sm:pb-10 lg:p-8 ${
        narrow ? 'max-w-3xl' : 'max-w-7xl'
      } ${className}`}
    >
      {children}
    </div>
  )
}
