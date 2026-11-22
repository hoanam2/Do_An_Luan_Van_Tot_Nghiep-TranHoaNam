const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const db = require('./config/db');
const { verifyMailer } = require('./utils/mailer');
const authRoutes = require('./routes/auth.routes');
const categoryRoutes = require('./routes/category.routes');
const vendorRoutes = require('./routes/vendor.routes');
const hotelRoutes = require('./routes/hotel.routes');
const roomRoutes = require('./routes/room.routes');
const voucherRoutes = require('./routes/voucher.routes');
const bookingRoutes = require('./routes/booking.routes');
const paymentRoutes = require('./routes/payment.routes');
const reviewRoutes = require('./routes/review.routes');
const aiRoutes = require('./routes/ai.routes');
const reportRoutes = require('./routes/report.routes');
const eventRoutes = require('./routes/event.routes');

const app = express();

// ============================================
// MIDDLEWARES TOÀN CỤC
// ============================================
app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',').map((s) => s.trim()) : true,
    credentials: true,
  })
);
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================
// HEALTH CHECK
// ============================================
app.get('/api/health', async (_req, res) => {
  try {
    const dbRes = await db.query('SELECT NOW() AS server_time, current_database() AS database');
    return res.status(200).json({
      success: true,
      status: 'OK',
      service: 'StayWithUs API',
      database: dbRes.rows[0].database,
      server_time: dbRes.rows[0].server_time,
    });
  } catch (error) {
    return res.status(503).json({
      success: false,
      status: 'DEGRADED',
      message: 'Không thể kết nối tới PostgreSQL.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

// ============================================
// API ROUTES - TOÀN BỘ 4 GIAI ĐOẠN
// ============================================
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/hotels', hotelRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/vouchers', voucherRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/events', eventRoutes);

// ============================================
// XỬ LÝ 404 NOT FOUND
// ============================================
app.use((req, res) => {
  return res.status(404).json({
    success: false,
    message: `Không tìm thấy đường dẫn ${req.method} ${req.originalUrl}`,
  });
});

// ============================================
// XỬ LÝ LỖI TẬP TRUNG (GLOBAL ERROR HANDLER)
// ============================================
app.use((err, _req, res, _next) => {
  if (err.code === '23505') {
    const detailText = String(err.detail || '').toLowerCase();
    const msg =
      detailText.includes('email') || detailText.includes('sdt') || detailText.includes('ma_so_thue')
        ? 'Thông tin của người đăng ký đã bị trùng. Vui lòng kiểm tra lại email, số điện thoại hoặc mã số thuế và nhập lại.'
        : 'Thông tin nhập vào đã tồn tại trong hệ thống. Vui lòng kiểm tra và nhập lại.';
    return res.status(409).json({
      success: false,
      message: msg,
    });
  }

  if (err.code === '23503') {
    return res.status(400).json({
      success: false,
      message: 'Dữ liệu tham chiếu không tồn tại hoặc đang được sử dụng (vi phạm khóa ngoại).',
      detail: process.env.NODE_ENV === 'development' ? err.detail : undefined,
    });
  }

  if (err.code === '23514') {
    return res.status(400).json({
      success: false,
      message: 'Dữ liệu không thỏa mãn ràng buộc hợp lệ của cơ sở dữ liệu (CHECK constraint).',
      detail: process.env.NODE_ENV === 'development' ? err.detail : undefined,
    });
  }

  if (err.code === '22P02') {
    return res.status(400).json({
      success: false,
      message: 'Kiểu dữ liệu tham số đầu vào không hợp lệ.',
    });
  }

  const statusCode = err.statusCode || err.status || 500;
  if (statusCode >= 500) {
    console.error('[Server Error]', err);
  }

  return res.status(statusCode).json({
    success: false,
    message: err.message || 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
});

// ============================================
// KHỞI ĐỘNG SERVER KHI CHẠY TRỰC TIẾP `node src/app.js`
// ============================================
const PORT = Number(process.env.PORT) || 5000;

const startServer = async () => {
  try {
    await db.testConnection();
    await verifyMailer().catch((err) => {
      console.warn('[Mailer] Không thể xác minh SMTP:', err.message);
    });

    app.listen(PORT, () => {
      console.log(`[Server] StayWithUs API đang chạy tại http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('[Server] Khởi động thất bại:', error.message);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

module.exports = app;
