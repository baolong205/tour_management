import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../../../services/api.js';
import { Icon } from '../../../components/UI.jsx';
import '../../../styles/invoice.css';

/** The same immutable invoice document is used for email and printing. */
export default function InvoiceButton({ bookingId, disabled = false }) {
  const [document, setDocument] = useState(null);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const frame = useRef(null);
  const dialog = useRef(null);
  const trigger = useRef(null);
  const loading = useRef(false);
  useEffect(() => {
    if (!document) return;
    const previousOverflow = window.document.body.style.overflow;
    window.document.body.style.overflow = 'hidden';
    dialog.current?.focus();
    return () => { window.document.body.style.overflow = previousOverflow; trigger.current?.focus(); };
  }, [document]);
  async function open() {
    if (loading.current) return;
    loading.current = true; setBusy(true); setError(''); setReady(false);
    try { setDocument(await api(`/bookings/${bookingId}/invoice/document`)); }
    catch (failure) { setError(failure.message); }
    finally { setBusy(false); loading.current = false; }
  }
  function print() {
    try { frame.current?.contentWindow?.focus(); frame.current?.contentWindow?.print(); }
    catch { setError('Trình duyệt chưa mở được cửa sổ in. Vui lòng thử lại.'); }
  }
  function handleKeys(event) {
    if (event.key === 'Escape') setDocument(null);
    if (event.key === 'Tab') {
      const controls = [...dialog.current.querySelectorAll('button:not(:disabled), iframe')];
      if (!controls.length) return;
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && (window.document.activeElement === first || window.document.activeElement === dialog.current)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && window.document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  }
  return <>
    <button ref={trigger} className="btn outline" type="button" disabled={disabled || busy} onClick={open} title={disabled ? 'Hóa đơn được phát hành sau khi xác nhận thanh toán' : 'Xem bản hóa đơn A4, in hoặc lưu PDF'}><Icon name="document" />{busy ? 'Đang tải hóa đơn...' : 'Xem / In hóa đơn'}</button>
    {error && !document && <p className="notice error" role="alert">{error}</p>}
    {document && createPortal(<div className="invoice-overlay" onClick={event => { if (event.target === event.currentTarget) setDocument(null); }}>
      <section ref={dialog} className="invoice-dialog" role="dialog" aria-modal="true" aria-label={`Hóa đơn ${document.number}`} tabIndex={-1} onKeyDown={handleKeys}>
        <header className="invoice-toolbar"><div><strong>Hóa đơn thanh toán</strong><small>{document.number}</small></div><div><button className="btn" type="button" disabled={!ready} onClick={print}>In / Lưu PDF</button><button className="btn outline" type="button" onClick={() => setDocument(null)}>Đóng</button></div></header>
        <p className="invoice-hint">Để tải PDF, chọn “Lưu dưới dạng PDF” trong cửa sổ in của trình duyệt.</p>
        {error && <p className="notice error" role="alert">{error}</p>}
        <iframe ref={frame} title={`Hóa đơn ${document.number}`} srcDoc={document.html} sandbox="allow-same-origin allow-modals" onLoad={() => setReady(true)} />
      </section>
    </div>, window.document.body)}
  </>;
}
