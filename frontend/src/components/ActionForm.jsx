import React, { useState } from 'react';
import { api } from '../services/api.js';
import { buildFormBody } from '../forms.js';

export default function ActionForm({ path, method = 'POST', fields, initial = {}, label = 'Lưu thay đổi', onSuccess }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      const result = await api(path, { method, body: buildFormBody(new FormData(event.currentTarget), fields) });
      setNotice('Đã lưu thành công.');
      onSuccess?.(result);
    } catch (error) { setError(error.message); } finally { setBusy(false); }
  }
  return <form onSubmit={submit}>
    {fields.map(field => <label key={field.name} hidden={field.type === 'hidden'}>{field.label}
      {field.options ? <select name={field.name} defaultValue={String(initial[field.name] ?? field.defaultValue ?? '')} required={field.required}>{!field.required && <option value="">Không chọn</option>}{field.options.map(option => <option key={option.value ?? option} value={option.value ?? option}>{option.label ?? option}</option>)}</select>
        : ['textarea', 'json'].includes(field.type) ? <textarea name={field.name} rows={field.type === 'json' ? 7 : 3} defaultValue={field.type === 'json' ? JSON.stringify(initial[field.name] ?? field.defaultValue ?? {}, null, 2) : initial[field.name] ?? ''} required={field.required} minLength={field.minLength} maxLength={field.maxLength} />
          : <input name={field.name} type={field.type ?? 'text'} defaultValue={initial[field.name] ?? field.defaultValue ?? ''} required={field.required} min={field.min} max={field.max} minLength={field.minLength} maxLength={field.maxLength} step={field.step} pattern={field.pattern} autoComplete={field.type === 'password' ? 'new-password' : undefined} />}
      {field.help && <small className="muted">{field.help}</small>}
    </label>)}
    {error && <p className="notice error" role="alert">{error}</p>}{notice && <p className="notice" role="status">{notice}</p>}
    <button className="btn" disabled={busy}>{busy ? 'Đang xử lý...' : label}</button>
  </form>;
}