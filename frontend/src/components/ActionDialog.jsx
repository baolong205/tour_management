import React, { useLayoutEffect, useId, useRef, useState } from 'react';
import { Icon } from './UI.jsx';

export default function ActionDialog({ title, children, label = title, className = '', disabled = false }) {
  const [open, setOpen] = useState(false);
  const dialog = useRef(null);
  const headingId = useId();
  useLayoutEffect(() => {
    if (!open) return;
    if (dialog.current && !dialog.current.open) dialog.current.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = overflow; };
  }, [open]);
  return <><button type="button" className={`record-action ${className}`} disabled={disabled} onClick={() => setOpen(true)}>{label}<Icon name="arrow" size={14} /></button>{open && <dialog ref={dialog} className="record-dialog" aria-labelledby={headingId} onClose={() => setOpen(false)}><header className="record-dialog-heading"><div><span>TOURGO · CHI TIẾT & THAO TÁC</span><h2 id={headingId}>{title}</h2></div><button type="button" className="record-dialog-close" aria-label="Đóng cửa sổ" onClick={() => dialog.current.close()}><Icon name="close" /></button></header><div className="record-dialog-body">{children}</div></dialog>}</>;
}