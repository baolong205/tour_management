import React, { useState } from 'react';
import { useApi } from '../hooks.js';
import { money, queryString } from '../utils.js';
import { reportCsv } from '../management.js';
import { State } from '../components/UI.jsx';

export default function Reports() {
  const [filters, setFilters] = useState({ groupBy: 'month' });
  const [revision, setRevision] = useState(0);
  const report = useApi(`/reports/overview?${queryString(filters)}`, revision);
  function download() {
    const url = URL.createObjectURL(new Blob([reportCsv(report.data.items)], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = 'bao-cao-doanh-thu.csv'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <><h2>Tổng quan & doanh thu</h2><form className="workspace-actions report-filters" onSubmit={event => { event.preventDefault(); setFilters(Object.fromEntries(new FormData(event.currentTarget))); }}><label>Từ ngày<input type="date" name="fromDate" /></label><label>Đến ngày<input type="date" name="toDate" /></label><label>Nhóm theo<select name="groupBy" defaultValue="month"><option value="day">Ngày</option><option value="month">Tháng</option><option value="year">Năm</option></select></label><button className="btn">Xem báo cáo</button></form>
    <State loading={report.loading} error={report.error} retry={() => setRevision(value => value + 1)} />{report.data && <><div className="stat-grid">{[['Tổng tour', report.data.tourCount], ['Tổng đơn', report.data.bookingCount], ['Chờ xác nhận', report.data.pendingBookings], ['Tiền nhận trong kỳ', money(report.data.received)], ['Tiền hoàn trong kỳ', money(report.data.refunded)], ['Thu ròng trong kỳ', money(report.data.net)]].map(([label, value]) => <section className="panel" key={label}>{label}<strong>{value}</strong></section>)}</div><p className="muted">Số tour và số đơn là tổng toàn hệ thống. Dòng tiền lọc theo thời điểm nhận/hoàn tiền; không phải lợi nhuận.</p><div className="workspace-actions"><button className="btn outline" onClick={download}>Xuất CSV (mở bằng Excel)</button><button className="btn outline" onClick={() => window.print()}>In / lưu PDF</button></div><div className="table-wrap"><table><thead><tr><th>Kỳ</th><th>Tiền nhận</th><th>Tiền hoàn</th><th>Thu ròng</th><th>Giao dịch nhận tiền</th></tr></thead><tbody>{report.data.items.map(row => <tr key={row.period}><td>{row.period}</td><td>{money(row.received)}</td><td>{money(row.refunded)}</td><td>{money(row.net)}</td><td>{row.transactions}</td></tr>)}</tbody></table></div></>}
  </>;
}