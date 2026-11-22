export const formatCurrency = (amount) => {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(num);
};

export const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return String(dateStr).slice(0, 10);
  return d.toLocaleDateString('vi-VN');
};

export const getDefaultDates = () => {
  const today = new Date();
  const checkIn = new Date(today);
  checkIn.setDate(today.getDate() + 3);
  const checkOut = new Date(today);
  checkOut.setDate(today.getDate() + 5);
  return {
    checkIn: checkIn.toISOString().slice(0, 10),
    checkOut: checkOut.toISOString().slice(0, 10),
  };
};

export const STATUS_LABELS = {
  CHO_XAC_NHAN: { label: 'Chờ xác nhận', cls: 'badge-warn' },
  DA_XAC_NHAN: { label: 'Đã xác nhận', cls: 'badge-info' },
  DA_CHECKIN: { label: 'Đang lưu trú', cls: 'badge-primary' },
  HOAN_THANH: { label: 'Hoàn thành', cls: 'badge-success' },
  DA_HUY: { label: 'Đã hủy', cls: 'badge-danger' },
  TU_CHOI: { label: 'Từ chối', cls: 'badge-danger' },
  CHO_DUYET: { label: 'Chờ duyệt', cls: 'badge-warn' },
  DA_DUYET: { label: 'Đã duyệt', cls: 'badge-success' },
  AN: { label: 'Đang ẩn', cls: 'badge-muted' },
  CHO_THANH_TOAN: { label: 'Chờ thanh toán', cls: 'badge-warn' },
  DA_THANH_TOAN: { label: 'Đã thanh toán', cls: 'badge-success' },
  CHUA_THANH_TOAN: { label: 'Chưa thanh toán', cls: 'badge-warn' },
  THAT_BAI: { label: 'Thất bại', cls: 'badge-danger' },
  DA_HOAN_TIEN: { label: 'Đã hoàn tiền', cls: 'badge-muted' },
};

export const getStatusBadge = (status) =>
  STATUS_LABELS[String(status || '').toUpperCase()] || { label: status || 'N/A', cls: 'badge-muted' };

// Ảnh minh họa đẹp theo id khách sạn (Unsplash) kèm fallback gradient
const HOTEL_PHOTOS = [
  'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=900&q=80',
];

export const getHotelCover = (hotelId) => {
  const idx = Math.abs(Number(hotelId) || 0) % HOTEL_PHOTOS.length;
  return HOTEL_PHOTOS[idx];
};
