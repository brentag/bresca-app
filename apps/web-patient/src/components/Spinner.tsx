export function Spinner({ size = 'sm' }: { size?: 'sm' | 'lg' }) {
  return <div className={size === 'lg' ? 'spinner spinner-lg' : 'spinner'} aria-label="Cargando" />;
}

export function FullPageSpinner() {
  return (
    <div className="center full" style={{ minHeight: '100dvh' }}>
      <Spinner size="lg" />
    </div>
  );
}
