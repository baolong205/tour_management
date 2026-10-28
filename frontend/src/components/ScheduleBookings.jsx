import React, { useState } from 'react';
import { useApi } from '../hooks.js';
import { useAuth } from '../context/AuthContext.jsx';
import { bookingLink } from '../staff-dashboard.js';
import { money, queryString } from '../utils.js';
import { OperationBadge, OperationEmpty } from './StaffOperations.jsx';
import { Pagination, State } from './UI.jsx';

function PaymentStatus({ bookingId, revision }) {
  const payment = useApi(`/payments/booking/${encodeURIComponent(bookingId)}`, revision);
  if (payment.loading) return <span>Đang đối chiếu…</span>;
  if (payment.error) return <span title={payment.error}>Chưa tải được thanh toán</span>;
  const data = payment.data;
  return <div><strong>{data?.paidTotal > 0 ? `Đã nhận ${money(data.paidTotal)}` : 'Chưa ghi nhận tiền'}</strong><small>Còn phải trả: {money(data?.outstanding)}</small>{data?.refundedTotal > 0 && <small>Đã hoàn: {money(data.refundedTotal)}</small>}</div>;
}

export default function ScheduleBookings({ scheduleId, revision }) {
  const { can } = useAuth();
  const [page, setPage] = useState(1);
  const list = useApi(can('booking:read') ? `/bookings?${queryString({ scheduleId, page, limit: 10 })}` : null, revision);
  if (!can('booking:read')) return <p className="ops-hint">Bạn cần quyền xem đơn để tra cứu khách thuộc lịch này.</p>;
  return <section className="ops-schedule-bookings" aria-label="Đơn và khách thuộc lịch"><h3 className="ops-subtitle">Đơn đặt tour & khách thuộc lịch ({list.data?.total ?? '…'})</h3><p className="ops-hint">Lịch đã tồn tại trước khi đặt tour. Thanh toán được ghi nhận vào đơn thuộc lịch này, không tạo lịch mới. Đơn đã thanh toán có thể còn chờ nhân viên xác nhận; đơn đã hủy vẫn được giữ để đối soát.</p><State loading={list.loading} error={list.error} />{!list.loading && !list.error && (list.data?.items?.length ? <div className="ops-table-scroll"><table className="ops-table"><thead><tr><th>Booking</th><th>Khách liên hệ</th><th>Hành khách</th><th>Trạng thái đơn</th><th>Thanh toán</th><th>Xử lý</th></tr></thead><tbody>{list.data.items.map(booking => <tr key={booking.id}><td><a href={bookingLink(booking.id)}>{booking.code}</a></td><td><strong>{booking.contactName}</strong><small>{booking.contactPhone}</small></td><td>{booking.passengerCount} người</td><td><OperationBadge status={booking.status} /></td><td>{can('payment:read') ? <PaymentStatus bookingId={booking.id} revision={revision} /> : 'Cần quyền xem thanh toán'}</td><td><a className="ops-view" href={bookingLink(booking.id)}>Mở đơn</a></td></tr>)}</tbody></table></div> : <OperationEmpty>Chưa có đơn thuộc lịch này. Kiểm tra đúng ngày đi và lịch được chọn trong đơn.</OperationEmpty>)}<Pagination page={page} total={list.data?.total || 0} limit={10} onChange={setPage} /></section>;
}