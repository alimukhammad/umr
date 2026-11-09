import { useEffect, useRef } from 'react';
import { useApp } from '../lib/app-context';

/** A full-height panel on phones, a centred dialog on desktop. Escape and the back button close it. */
export function Sheet({ title, children, onClose, wide }: { title: React.ReactNode; children: React.ReactNode; onClose?: () => void; wide?: boolean }) {
  const { close, t } = useApp();
  const ref = useRef<HTMLHeadingElement>(null);
  const self = useRef<HTMLDivElement>(null);
  const doClose = onClose ?? close;

  useEffect(() => {
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      const all = document.querySelectorAll('.overlay');
      if (e.key === 'Escape' && all[all.length - 1] === self.current) doClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [doClose]);

  return (
    <div className="overlay" ref={self} onClick={(e) => e.target === e.currentTarget && doClose()}>
      <section className={'sheet' + (wide ? ' wide' : '')} role="dialog" aria-modal="true" aria-labelledby="sheet-title">
        <header className="sheet-head">
          <h2 id="sheet-title" tabIndex={-1} ref={ref}>
            {title}
          </h2>
          <button className="icon-btn" onClick={doClose} aria-label={t.common.close}>
            ×
          </button>
        </header>
        <div className="sheet-body">{children}</div>
      </section>
    </div>
  );
}
