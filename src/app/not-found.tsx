export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="text-center space-y-2">
        <h2 className="font-display text-2xl font-bold text-on-surface">Page Not Found</h2>
        <p className="text-on-surface-variant">The page you are looking for does not exist.</p>
      </div>
    </div>
  );
}
