import React from 'react';
import { Icon } from './UI.jsx';
import { operationLabel } from '../staff-operations.js';

export function OperationBadge({ status }) {
  return <span className={`ops-badge ${String(status || '').toLowerCase()}`}>{operationLabel(status)}</span>;
}
export function OperationHeader({ icon, eyebrow, title, description, onRefresh, children }) {
  return <header className="ops-heading"><div><span className="ops-eyebrow">{eyebrow}</span><h1><Icon name={icon} size={26} />{title}</h1><p>{description}</p></div><div className="ops-heading-actions"><button className="btn outline" type="button" onClick={onRefresh}><Icon name="clock" size={16} />Làm mới</button>{children}</div></header>;
}
export function OperationFacts({ facts }) {
  return <dl className="ops-facts">{facts.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value ?? 'Chưa có thông tin'}</dd></div>)}</dl>;
}
export function OperationEmpty({ children }) {
  return <div className="ops-empty"><Icon name="search" size={32} /><h3>Không có kết quả</h3><p>{children}</p></div>;
}