// Placeholder mark: a single woven cell (Design brief deliverable, to be replaced by the real logo).
export function Mark({ size = 32, withWord = true }: { size?: number; withWord?: boolean }) {
  return (
    <span className="mark" aria-label="Umr">
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
        <rect x="4" y="4" width="24" height="24" rx="2" fill="var(--lived)" />
        <path d="M4 12h24M4 20h24" stroke="var(--bg)" strokeWidth="2" opacity=".55" />
        <path d="M12 4v24M20 4v24" stroke="var(--now)" strokeWidth="2" opacity=".9" />
      </svg>
      {withWord && <span className="word">Umr</span>}
    </span>
  );
}
