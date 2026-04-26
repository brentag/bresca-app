export function ProgressDots({ step, total }: { step: number; total: number }) {
  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: 28 }}>
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          style={{
            height: 6, borderRadius: 100,
            background: i === step ? '#00C87A' : '#E2E8F0',
            width: i === step ? 20 : 6,
            transition: 'all 250ms ease-out',
          }}
        />
      ))}
    </div>
  );
}
