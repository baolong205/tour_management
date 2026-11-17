
export default function PaymentReceiptStatus({ receipt, email }) {
  if (!receipt) return null;
  const messages = {
    PENDING: 'Email xác nhận thanh toán đang chờ gửi',
    SENDING: 'Đang gửi email xác nhận thanh toán',
    SENT: 'Đã gửi email xác nhận thanh toán',
    FAILED: 'Chưa gửi được email xác nhận. Vui lòng liên hệ hỗ trợ',
  };
  return <p className="payment-receipt-status" role="status">{messages[receipt.status] || messages.PENDING}{email ? <> · <strong>{email}</strong></> : null}{receipt.status === 'SENT' && <small> Kiểm tra cả thư mục Spam / Thư rác.</small>}</p>;
}
