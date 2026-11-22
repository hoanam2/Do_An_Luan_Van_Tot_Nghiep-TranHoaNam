const db = require('../config/db');
const { generateText } = require('../config/gemini');
const aiService = require('../services/ai.service');
const { assertHotelOwnership } = require('./hotel.controller');

/**
 * POST /api/ai/embeddings/sync (Admin)
 * Đồng bộ vector embedding (Gemini) vào cột khach_san.embedding (REAL[]) cho toàn bộ khách sạn.
 * Body tùy chọn: { only_missing?: boolean }
 */
const syncAllEmbeddings = async (req, res, next) => {
  try {
    const onlyMissing = Boolean(req.body?.only_missing);
    const report = await aiService.syncAllHotelEmbeddings({ onlyMissing });

    return res.status(200).json({
      success: true,
      message: `Đã đồng bộ vector embedding cho ${report.synced_count}/${report.total_candidates} khách sạn.`,
      data: report,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * POST /api/ai/embeddings/hotel/:id (Vendor chủ khách sạn / Admin)
 * Tạo hoặc cập nhật vector embedding cho 1 khách sạn cụ thể (nên gọi sau khi cập nhật mô tả/tiện ích/phòng).
 */
const syncHotelEmbedding = async (req, res, next) => {
  try {
    const hotelId = Number(req.params.id);
    await assertHotelOwnership(hotelId, req.user);

    const synced = await aiService.syncSingleHotelEmbedding(hotelId);
    return res.status(200).json({
      success: true,
      message: 'Cập nhật vector embedding cho khách sạn thành công.',
      data: synced,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * POST /api/ai/search
 * Tìm kiếm khách sạn bằng ngôn ngữ tự nhiên tiếng Việt (Gemini Embedding + PostgreSQL cosine_similarity).
 * Body: { query, limit?, min_similarity?, ngay_nhan_phong?, ngay_tra_phong? }
 */
const semanticSearch = async (req, res, next) => {
  try {
    const queryText = String(req.body.query || '').trim();
    if (!queryText) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập nội dung tìm kiếm (query).',
      });
    }

    const {
      limit = 8,
      min_similarity = 0.25,
      ngay_nhan_phong = null,
      ngay_tra_phong = null,
      tinh_thanh,
      hang_sao_min,
      min_price,
      max_price,
      so_khach,
    } = req.body;

    const searchResult = await aiService.runSemanticHotelSearch({
      queryText,
      limit,
      minSimilarity: min_similarity,
      ngay_nhan_phong,
      ngay_tra_phong,
      overrideFilters: {
        tinh_thanh,
        hang_sao_min,
        min_price,
        max_price,
        so_khach,
      },
    });

    return res.status(200).json({
      success: true,
      mode: searchResult.mode,
      extracted_filters: searchResult.extracted_filters,
      total: searchResult.hotels.length,
      data: searchResult.hotels,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/ai/hotels/:id/similar
 * Gợi ý các khách sạn tương tự bằng hàm PostgreSQL cosine_similarity(REAL[], REAL[]).
 */
const getSimilarHotels = async (req, res, next) => {
  try {
    const hotelId = Number(req.params.id);
    const limit = Math.min(12, Math.max(1, Number(req.query.limit) || 4));

    await aiService.ensureEmbeddingColumn();

    const targetRes = await db.query(
      'SELECT id_khachsan, ten_khachsan, id_diadiem, hang_sao, embedding FROM khach_san WHERE id_khachsan = $1 LIMIT 1',
      [hotelId]
    );

    if (targetRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy khách sạn.' });
    }

    const target = targetRes.rows[0];

    // Nếu khách sạn đích đã có embedding -> xếp hạng bằng cosine_similarity ngay trong PostgreSQL
    if (target.embedding) {
      const result = await db.query(
        `SELECT
           ks.id_khachsan,
           ks.ten_khachsan,
           ks.dia_chi,
           ks.hang_sao,
           dd.tinh_thanh,
           dd.quan_huyen,
           ROUND(cosine_similarity(ks.embedding, $1::real[])::numeric, 4)::float8 AS similarity_score,
           COALESCE((SELECT MIN(gia_moi_dem) FROM loai_phong WHERE id_khachsan = ks.id_khachsan), 0)::numeric AS gia_thap_nhat,
           COALESCE((SELECT ROUND(AVG(so_sao)::numeric, 2) FROM danh_gia WHERE id_khachsan = ks.id_khachsan AND trang_thai_duyet = 'HIEN_THI'), 0) AS diem_danh_gia
         FROM khach_san ks
         INNER JOIN dia_diem dd ON dd.id_diadiem = ks.id_diadiem
         WHERE ks.id_khachsan <> $2
           AND ks.trang_thai_duyet = 'DA_DUYET'
           AND ks.embedding IS NOT NULL
         ORDER BY similarity_score DESC, diem_danh_gia DESC
         LIMIT $3`,
        [target.embedding, hotelId, limit]
      );

      return res.status(200).json({
        success: true,
        mode: 'COSINE_SIMILARITY',
        data: result.rows.map((r) => ({
          ...r,
          id_khachsan: Number(r.id_khachsan),
          gia_thap_nhat: Number(r.gia_thap_nhat),
          diem_danh_gia: Number(r.diem_danh_gia),
        })),
      });
    }

    // Fallback: gợi ý cùng địa điểm hoặc cùng hạng sao khi chưa đồng bộ embedding
    const fallbackRes = await db.query(
      `SELECT
         ks.id_khachsan,
         ks.ten_khachsan,
         ks.dia_chi,
         ks.hang_sao,
         dd.tinh_thanh,
         dd.quan_huyen,
         COALESCE((SELECT MIN(gia_moi_dem) FROM loai_phong WHERE id_khachsan = ks.id_khachsan), 0)::numeric AS gia_thap_nhat,
         COALESCE((SELECT ROUND(AVG(so_sao)::numeric, 2) FROM danh_gia WHERE id_khachsan = ks.id_khachsan AND trang_thai_duyet = 'HIEN_THI'), 0) AS diem_danh_gia
       FROM khach_san ks
       INNER JOIN dia_diem dd ON dd.id_diadiem = ks.id_diadiem
       WHERE ks.id_khachsan <> $1
         AND ks.trang_thai_duyet = 'DA_DUYET'
       ORDER BY (ks.id_diadiem = $2) DESC, ABS(COALESCE(ks.hang_sao, 3) - COALESCE($3, 3)) ASC, diem_danh_gia DESC
       LIMIT $4`,
      [hotelId, target.id_diadiem, target.hang_sao, limit]
    );

    return res.status(200).json({
      success: true,
      mode: 'LOCATION_STAR_FALLBACK',
      data: fallbackRes.rows.map((r) => ({
        ...r,
        id_khachsan: Number(r.id_khachsan),
        gia_thap_nhat: Number(r.gia_thap_nhat),
        diem_danh_gia: Number(r.diem_danh_gia),
      })),
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * POST /api/ai/chat
 * Trợ lý Chatbot RAG tư vấn đặt phòng khách sạn thông minh dựa trên dữ liệu thật trong hotel_booking_db.
 * Body: { message, history?: [{ role: 'user'|'assistant', text: string }], ngay_nhan_phong?, ngay_tra_phong? }
 */
const chatAdvisor = async (req, res, next) => {
  try {
    const message = String(req.body.message || '').trim();
    const history = Array.isArray(req.body.history) ? req.body.history.slice(-6) : [];
    const { ngay_nhan_phong = null, ngay_tra_phong = null } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập nội dung tin nhắn (message).',
      });
    }

    // Bước 1 (Retrieval): Truy xuất Top 5 khách sạn phù hợp nhất từ PostgreSQL
    const retrieval = await aiService.runSemanticHotelSearch({
      queryText: message,
      limit: 5,
      minSimilarity: 0.2,
      ngay_nhan_phong,
      ngay_tra_phong,
    });

    const hotelsContext =
      retrieval.hotels.length > 0
        ? retrieval.hotels
            .map(
              (h, idx) =>
                `${idx + 1}. [ID: ${h.id_khachsan}] ${h.ten_khachsan} (${h.hang_sao || 'N/A'} sao) - ${h.quan_huyen}, ${h.tinh_thanh} | Giá từ ${h.gia_thap_nhat.toLocaleString('vi-VN')} VNĐ/đêm | Đánh giá: ${h.diem_danh_gia}/5 (${h.so_luot_danh_gia} lượt) | Tiện ích: ${Array.isArray(h.tien_ich) ? h.tien_ich.join(', ') : 'Chưa cập nhật'} | Mô tả: ${h.mo_ta || 'Không có'}`
            )
            .join('\n')
        : 'Hiện chưa tìm thấy khách sạn nào khớp chính xác tiêu chí trong hệ thống.';

    const conversationContext = history
      .map((item) => `${item.role === 'assistant' ? 'Trợ lý' : 'Khách hàng'}: ${item.text}`)
      .join('\n');

    // Bước 2 (Generation): Sinh câu trả lời tư vấn tự nhiên bằng Gemini
    let reply;
    const hasGeminiKey = Boolean(
      process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key'
    );

    if (hasGeminiKey) {
      const prompt = `${conversationContext ? `Lịch sử trò chuyện gần đây:\n${conversationContext}\n\n` : ''}Danh sách khách sạn thực tế truy xuất từ cơ sở dữ liệu StayWithUs:
${hotelsContext}

Câu hỏi hiện tại của khách hàng: "${message}"

Hãy tư vấn ngắn gọn, thân thiện, tiếng Việt tự nhiên, nêu rõ tên khách sạn, hạng sao, khoảng giá và lý do phù hợp. Nếu chưa có khách sạn khớp, hãy gợi ý khách mở rộng tiêu chí (địa điểm, ngân sách hoặc ngày nhận/trả phòng).`;

      reply = await generateText(prompt, {
        systemInstruction:
          'Bạn là trợ lý đặt phòng khách sạn thông minh của hệ thống StayWithUs. Chỉ sử dụng thông tin khách sạn có trong dữ liệu được cung cấp, tuyệt đối không bịa ra khách sạn hoặc giá phòng không tồn tại.',
        temperature: 0.5,
      });
    } else {
      reply =
        retrieval.hotels.length > 0
          ? `Tôi tìm thấy ${retrieval.hotels.length} khách sạn phù hợp với yêu cầu của bạn: ${retrieval.hotels.map((h) => `${h.ten_khachsan} (từ ${h.gia_thap_nhat.toLocaleString('vi-VN')} VNĐ/đêm)`).join(', ')}. (Hãy cấu hình GEMINI_API_KEY trong .env để bật hội thoại tư vấn AI chi tiết).`
          : 'Hiện chưa tìm thấy khách sạn phù hợp với tiêu chí của bạn. Hãy thử thay đổi địa điểm hoặc khoảng giá nhé!';
    }

    return res.status(200).json({
      success: true,
      data: {
        reply,
        search_mode: retrieval.mode,
        extracted_filters: retrieval.extracted_filters,
        suggested_hotels: retrieval.hotels,
      },
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/ai/hotels/:id/review-summary
 * Dùng Gemini phân tích & tóm tắt các đánh giá (danh_gia) của khách sạn.
 */
const summarizeHotelReviews = async (req, res, next) => {
  try {
    const hotelId = Number(req.params.id);

    const [hotelRes, reviewsRes] = await Promise.all([
      db.query('SELECT id_khachsan, ten_khachsan FROM khach_san WHERE id_khachsan = $1 LIMIT 1', [
        hotelId,
      ]),
      db.query(
        `SELECT so_sao, noi_dung
         FROM danh_gia
         WHERE id_khachsan = $1
           AND UPPER(trang_thai_duyet) = 'HIEN_THI'
           AND noi_dung IS NOT NULL
           AND TRIM(noi_dung) <> ''
         ORDER BY id_danhgia DESC
         LIMIT 30`,
        [hotelId]
      ),
    ]);

    if (hotelRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy khách sạn.' });
    }

    if (reviewsRes.rowCount === 0) {
      return res.status(200).json({
        success: true,
        data: {
          id_khachsan: hotelId,
          so_danh_gia_phan_tich: 0,
          tom_tat: 'Khách sạn hiện chưa có đánh giá dạng văn bản nào để tóm tắt.',
          diem_noi_bat: [],
          diem_can_cai_thien: [],
          phu_hop_voi: [],
          cam_xuc_tong_the: 'TRUNG_TINH',
        },
      });
    }

    const reviewsText = reviewsRes.rows
      .map((r, idx) => `${idx + 1}. (${r.so_sao}/5 sao): ${r.noi_dung}`)
      .join('\n');

    const prompt = `Hãy phân tích và tóm tắt các đánh giá sau của khách sạn "${hotelRes.rows[0].ten_khachsan}" và trả về JSON đúng cấu trúc:
{
  "tom_tat": "Đoạn tóm tắt tổng quan 2-3 câu bằng tiếng Việt",
  "diem_noi_bat": ["Ưu điểm 1", "Ưu điểm 2"],
  "diem_can_cai_thien": ["Nhược điểm 1"],
  "phu_hop_voi": ["Gia đình", "Cặp đôi", "Công tác"],
  "cam_xuc_tong_the": "TICH_CUC" | "TRUNG_TINH" | "TIEU_CUC"
}

Danh sách đánh giá:
${reviewsText}`;

    const rawJson = await generateText(prompt, {
      temperature: 0.3,
      responseMimeType: 'application/json',
    });

    const summary = JSON.parse(rawJson);

    return res.status(200).json({
      success: true,
      data: {
        id_khachsan: hotelId,
        ten_khachsan: hotelRes.rows[0].ten_khachsan,
        so_danh_gia_phan_tich: reviewsRes.rowCount,
        ...summary,
      },
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  syncAllEmbeddings,
  syncHotelEmbedding,
  semanticSearch,
  getSimilarHotels,
  chatAdvisor,
  summarizeHotelReviews,
};
