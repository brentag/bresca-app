type Props = { label: string; color: string; active: boolean; onClick: () => void };

export function CategoryChip({ label, color, active, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '8px 16px', borderRadius: 100,
        border: `1.5px solid ${active ? color : '#E2E8F0'}`,
        background: active ? color + '18' : '#fff',
        color: active ? color : '#64748B',
        fontSize: 13, fontWeight: active ? 600 : 400, cursor: 'pointer',
        minHeight: 44, whiteSpace: 'nowrap', fontFamily: "'Space Grotesk',sans-serif",
        transition: 'all 150ms ease-out',
      }}
    >
      {label}
    </button>
  );
}
