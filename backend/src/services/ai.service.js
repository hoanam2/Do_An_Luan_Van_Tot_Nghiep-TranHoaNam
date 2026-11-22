const db = require('../config/db');
const { generateText, createEmbedding, validateVector } = require('../config/gemini');

let embeddingColumnReady = false;

/**
 * Đảm bảo bảng khach_san đã có cột embedding REAL[] để lưu vector từ Gemini
 * và sử dụng trực tiếp với hàm cosine_similarity(REAL[], REAL[]) trong PostgreSQL.
 */
const ensureEmbeddingColumn = async () => {
  if (embeddingColumnReady) return true;

  const checkRes = await db.query(
    `SELECT EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'khach_san'
         AND column_name = 'embedding'
     ) AS has_col`
  );

  if (!checkRes.rows[0]?.has_col) {
    await db.query('ALTER TABLE khach_san ADD COLUMN IF NOT EXISTS embedding REAL[]');
  }

  embeddingColumnReady = true;
  return true;
};

/**
 * Tổng hợp hồ sơ ngữ nghĩa giàu thông tin của một khách sạn để tạo vector embedding.
 */
const buildHotelSemanticText = (hotel) => {
  const parts = [
    `Tên khách sạn: ${hotel.ten_khachsan}`,
    hotel.hang_sao ? `Hạng sao: ${hotel.hang_sao} sao` : '',
    `Địa điểm: ${hotel.quan_huyen}, ${hotel.tinh_thanh}`,
    `Địa chỉ: ${hotel.dia_chi}`,
    hotel.mo_ta ? `Mô tả: ${hotel.mo_ta}` : '',
    hotel.danh_sach_tien_ich ? `Tiện ích nổi bật: ${hotel.danh_sach_tien_ich}` : '',
    hotel.danh_sach_loai_phong ? `Các loại phòng: ${hotel.danh_sach_loai_phong}` : '',
    hotel.gia_thap_nhat
      ? `Giá phòng mỗi đêm từ ${Number(hotel.gia_thap_nhat).toLocaleString('vi-VN')} đến ${Number(hotel.gia_cao_nhat || hotel.gia_thap_nhat).toLocaleString('vi-VN')} VNĐ`
      : '',
    hotel.danh_sach_dich_vu ? `Dịch vụ đi kèm: ${hotel.danh_sach_dich_vu}` : '',
  ];

  return parts.filter(Boolean).join('. ');
};

/**
 * Lấy dữ liệu tổng hợp của 1 hoặc tất cả khách sạn để sinh vector embedding.
 */
const fetchHotelsForEmbedding = async (hotelId = null) => {
  const params = [];
  let whereClause = '';
  if (hotelId) {
    params.push(Number(hotelId));
    whereClause = 'WHERE ks.id_khachsan = $1';
  }

  const result = await db.query(
    `SELECT
       ks.id_khachsan,
       ks.ten_khachsan,
       ks.dia_chi,
       ks.mo_ta,
       ks.hang_sao,
       dd.tinh_thanh,
       dd.quan_huyen,
       (SELECT string_agg(ti.ten_tienich, ', ')
        FROM khach_san_tien_ich ksti
        INNER JOIN tien_ich ti ON ti.id_tienich = ksti.id_tienich
        WHERE ksti.id_khachsan = ks.id_khachsan) AS danh_sach_tien_ich,
       (SELECT string_agg(lp.ten_loaiphong || ' (sức chứa ' || lp.suc_chua || ' người, giá ' || lp.gia_moi_dem || ' VND)', '; ')
        FROM loai_phong lp
        WHERE lp.id_khachsan = ks.id_khachsan) AS danh_sach_loai_phong,
       (SELECT MIN(lp.gia_moi_dem) FROM loai_phong lp WHERE lp.id_khachsan = ks.id_khachsan) AS gia_thap_nhat,
       (SELECT MAX(lp.gia_moi_dem) FROM loai_phong lp WHERE lp.id_khachsan = ks.id_khachsan) AS gia_cao_nhat,
       (SELECT string_agg(dv.ten_dichvu, ', ')
        FROM dich_vu dv
        WHERE dv.id_khachsan = ks.id_khachsan) AS danh_sach_dich_vu
     FROM khach_san ks
     INNER JOIN dia_diem dd ON dd.id_diadiem = ks.id_diadiem
     ${whereClause}
     ORDER BY ks.id_khachsan ASC`,
    params
  );

  return result.rows;
};

/**
 * Tạo và lưu vector embedding REAL[] cho một khách sạn cụ thể vào khach_san.embedding.
 */
const syncSingleHotelEmbedding = async (hotelId) => {
  await ensureEmbeddingColumn();
  const rows = await fetchHotelsForEmbedding(hotelId);
  if (rows.length === 0) {
    const err = new Error('Không tìm thấy khách sạn để tạo embedding.');
    err.statusCode = 404;
    throw err;
  }

  const hotel = rows[0];
  const semanticText = buildHotelSemanticText(hotel);
  const vector = validateVector(await createEmbedding(semanticText));

  await db.query(
    'UPDATE khach_san SET embedding = $1::real[] WHERE id_khachsan = $2',
    [vector, hotel.id_khachsan]
  );

  return {
    id_khachsan: Number(hotel.id_khachsan),
    ten_khachsan: hotel.ten_khachsan,
    dimensions: vector.length,
  };
};

/**
 * Đồng bộ vector embedding cho tất cả khách sạn (hoặc chỉ những khách sạn chưa có vector).
 */
const syncAllHotelEmbeddings = async ({ onlyMissing = false } = {}) => {
  await ensureEmbeddingColumn();

  const allHotels = await fetchHotelsForEmbedding();
  let targetHotels = allHotels;

  if (onlyMissing) {
    const missingRes = await db.query(
      'SELECT id_khachsan FROM khach_san WHERE embedding IS NULL'
    );
    const missingIds = new Set(missingRes.rows.map((r) => Number(r.id_khachsan)));
    targetHotels = allHotels.filter((h) => missingIds.has(Number(h.id_khachsan)));
  }

  const synced = [];
  const failed = [];

  for (const hotel of targetHotels) {
    try {
      const text = buildHotelSemanticText(hotel);
      const vector = validateVector(await createEmbedding(text));
      await db.query(
        'UPDATE khach_san SET embedding = $1::real[] WHERE id_khachsan = $2',
        [vector, hotel.id_khachsan]
      );
      synced.push({
        id_khachsan: Number(hotel.id_khachsan),
        ten_khachsan: hotel.ten_khachsan,
        dimensions: vector.length,
      });
    } catch (err) {
      failed.push({
        id_khachsan: Number(hotel.id_khachsan),
        ten_khachsan: hotel.ten_khachsan,
        error: err.message,
      });
    }
  }

  return {
    total_candidates: targetHotels.length,
    synced_count: synced.length,
    failed_count: failed.length,
    synced,
    failed,
  };
};

/**
 * Dùng Gemini phân tích câu truy vấn ngôn ngữ tự nhiên tiếng Việt thành bộ lọc có cấu trúc.
 * Ví dụ: "Khách sạn 4 sao ở Đà Nẵng gần biển có hồ bơi giá dưới 2 triệu cho 2 người"
 */
const extractFiltersFromNaturalQuery = async (userQuery) => {
  try {
    const prompt = `Phân tích câu tìm kiếm khách sạn sau của người dùng và trả về JSON thuần đúng cấu trúc:
{
  "tinh_thanh": string | null,
  "hang_sao_min": number | null,
  "min_price": number | null,
  "max_price": number | null,
  "so_khach": number | null,
  "semantic_query": string
}
Quy tắc:
- Quy đổi giá tiền sang VNĐ (ví dụ: "2 triệu" -> 2000000, "500k" -> 500000).
- Nếu không đề cập thì trả về null.
- semantic_query giữ lại toàn bộ ý định ngữ nghĩa (không gian, view, tiện ích, phong cách, địa điểm).
- Chỉ trả JSON hợp lệ, không thêm giải thích.

Câu truy vấn: "${userQuery}"`;

    const raw = await generateText(prompt, {
      temperature: 0.1,
      responseMimeType: 'application/json',
    });

    const parsed = JSON.parse(raw);
    return {
      tinh_thanh: parsed.tinh_thanh || null,
      hang_sao_min: Number.isInteger(Number(parsed.hang_sao_min)) ? Number(parsed.hang_sao_min) : null,
      min_price: Number.isFinite(Number(parsed.min_price)) && Number(parsed.min_price) > 0 ? Number(parsed.min_price) : null,
      max_price: Number.isFinite(Number(parsed.max_price)) && Number(parsed.max_price) > 0 ? Number(parsed.max_price) : null,
      so_khach: Number.isInteger(Number(parsed.so_khach)) && Number(parsed.so_khach) > 0 ? Number(parsed.so_khach) : null,
      semantic_query: parsed.semantic_query || userQuery,
    };
  } catch (_err) {
    return {
      tinh_thanh: null,
      hang_sao_min: null,
      min_price: null,
      max_price: null,
      so_khach: null,
      semantic_query: userQuery,
    };
  }
};

/**
 * Tìm kiếm khách sạn lai (Hybrid Semantic Search):
 * Kết hợp bộ lọc SQL chuẩn + xếp hạng độ tương đồng bằng hàm PostgreSQL cosine_similarity(REAL[], REAL[]).
 */
const runSemanticHotelSearch = async ({
  queryText,
  limit = 6,
  minSimilarity = 0.25,
  ngay_nhan_phong = null,
  ngay_tra_phong = null,
  overrideFilters = {},
}) => {
  await ensureEmbeddingColumn();

  const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key');

  let extracted = {
    tinh_thanh: null,
    hang_sao_min: null,
    min_price: null,
    max_price: null,
    so_khach: null,
    semantic_query: queryText,
  };
  let queryVector = null;
  let searchMode = 'KEYWORD_FALLBACK';

  if (hasGeminiKey) {
    try {
      const [parsedFilters, vector] = await Promise.all([
        extractFiltersFromNaturalQuery(queryText),
        createEmbedding(queryText),
      ]);
      extracted = parsedFilters;
      queryVector = validateVector(vector);
      searchMode = 'SEMANTIC_COSINE_SIMILARITY';
    } catch (err) {
      console.warn('[AI Search] Chuyển sang fallback tìm kiếm từ khóa do lỗi Gemini:', err.message);
    }
  }

  const filters = {
    tinh_thanh: overrideFilters.tinh_thanh ?? extracted.tinh_thanh,
    hang_sao_min: overrideFilters.hang_sao_min ?? extracted.hang_sao_min,
    min_price: overrideFilters.min_price ?? extracted.min_price,
    max_price: overrideFilters.max_price ?? extracted.max_price,
    so_khach: overrideFilters.so_khach ?? extracted.so_khach,
  };

  // Kiểm tra có khách sạn nào đã có embedding chưa
  let useVectorSql = false;
  if (queryVector) {
    const embCheck = await db.query(
      `SELECT EXISTS (
         SELECT 1 FROM khach_san
         WHERE trang_thai_duyet = 'DA_DUYET' AND embedding IS NOT NULL
       ) AS has_embeddings`
    );
    useVectorSql = Boolean(embCheck.rows[0]?.has_embeddings);
    if (!useVectorSql) {
      searchMode = 'FILTER_FALLBACK_NO_EMBEDDINGS_YET';
    }
  }

  const conditions = [`ks.trang_thai_duyet = 'DA_DUYET'`];
  const params = [];

  let similaritySelect = '0::float8 AS similarity_score';
  let orderClause = 'diem_danh_gia DESC, ks.hang_sao DESC NULLS LAST, ks.id_khachsan DESC';

  if (useVectorSql) {
    params.push(queryVector);
    const vecParam = `$${params.length}::real[]`;
    similaritySelect = `CASE WHEN ks.embedding IS NOT NULL THEN ROUND(cosine_similarity(ks.embedding, ${vecParam})::numeric, 4)::float8 ELSE 0::float8 END AS similarity_score`;
    conditions.push(`(ks.embedding IS NOT NULL AND cosine_similarity(ks.embedding, ${vecParam}) >= $${params.length + 1})`);
    params.push(Number(minSimilarity));
    orderClause = 'similarity_score DESC, diem_danh_gia DESC, ks.id_khachsan DESC';
  } else if (queryText && !filters.tinh_thanh) {
    params.push(`%${String(queryText).trim()}%`);
    const kw = `$${params.length}`;
    conditions.push(
      `(ks.ten_khachsan ILIKE ${kw} OR ks.mo_ta ILIKE ${kw} OR ks.dia_chi ILIKE ${kw} OR dd.tinh_thanh ILIKE ${kw} OR dd.quan_huyen ILIKE ${kw})`
    );
  }

  if (filters.tinh_thanh) {
    params.push(`%${String(filters.tinh_thanh).trim()}%`);
    conditions.push(`(dd.tinh_thanh ILIKE $${params.length} OR dd.quan_huyen ILIKE $${params.length})`);
  }

  if (filters.hang_sao_min) {
    params.push(Number(filters.hang_sao_min));
    conditions.push(`ks.hang_sao >= $${params.length}`);
  }

  if (filters.min_price) {
    params.push(Number(filters.min_price));
    conditions.push(
      `EXISTS (SELECT 1 FROM loai_phong lp WHERE lp.id_khachsan = ks.id_khachsan AND lp.gia_moi_dem >= $${params.length})`
    );
  }

  if (filters.max_price) {
    params.push(Number(filters.max_price));
    conditions.push(
      `EXISTS (SELECT 1 FROM loai_phong lp WHERE lp.id_khachsan = ks.id_khachsan AND lp.gia_moi_dem <= $${params.length})`
    );
  }

  if (ngay_nhan_phong && ngay_tra_phong) {
    params.push(ngay_nhan_phong, ngay_tra_phong);
    const checkInParam = `$${params.length - 1}`;
    const checkOutParam = `$${params.length}`;
    let capCond = '';
    if (filters.so_khach) {
      params.push(Number(filters.so_khach));
      capCond = `AND lp.suc_chua >= $${params.length}`;
    }
    conditions.push(
      `EXISTS (
        SELECT 1 FROM loai_phong lp
        INNER JOIN phong p ON p.id_loaiphong = lp.id_loaiphong
        WHERE lp.id_khachsan = ks.id_khachsan
          ${capCond}
          AND UPPER(p.trang_thai_phong) NOT IN ('BAO_TRI', 'TAM_NGUNG')
          AND NOT EXISTS (
            SELECT 1 FROM chi_tiet_dat_phong ctdp
            INNER JOIN don_dat_phong ddp ON ddp.id_dondat = ctdp.id_dondat
            WHERE ctdp.id_phong = p.id_phong
              AND UPPER(ddp.trang_thai_don) NOT IN ('DA_HUY', 'TU_CHOI')
              AND ddp.ngay_nhan_phong < ${checkOutParam}::date
              AND ddp.ngay_tra_phong > ${checkInParam}::date
          )
      )`
    );
  } else if (filters.so_khach) {
    params.push(Number(filters.so_khach));
    conditions.push(
      `EXISTS (SELECT 1 FROM loai_phong lp WHERE lp.id_khachsan = ks.id_khachsan AND lp.suc_chua >= $${params.length})`
    );
  }

  params.push(Math.min(30, Math.max(1, Number(limit) || 6)));
  const limitParam = `$${params.length}`;

  const sql = `
    SELECT
      ks.id_khachsan,
      ks.ten_khachsan,
      ks.dia_chi,
      ks.mo_ta,
      ks.hang_sao,
      dd.tinh_thanh,
      dd.quan_huyen,
      ${similaritySelect},
      COALESCE(lp_stats.gia_thap_nhat, 0)::numeric AS gia_thap_nhat,
      COALESCE(lp_stats.gia_cao_nhat, 0)::numeric AS gia_cao_nhat,
      COALESCE(dg_stats.diem_danh_gia, 0)::numeric(3,2) AS diem_danh_gia,
      COALESCE(dg_stats.so_luot_danh_gia, 0)::int AS so_luot_danh_gia,
      COALESCE(ti_agg.tien_ich, '[]'::json) AS tien_ich
    FROM khach_san ks
    INNER JOIN dia_diem dd ON dd.id_diadiem = ks.id_diadiem
    LEFT JOIN LATERAL (
      SELECT MIN(gia_moi_dem) AS gia_thap_nhat, MAX(gia_moi_dem) AS gia_cao_nhat
      FROM loai_phong WHERE id_khachsan = ks.id_khachsan
    ) lp_stats ON TRUE
    LEFT JOIN LATERAL (
      SELECT ROUND(AVG(so_sao)::numeric, 2) AS diem_danh_gia, COUNT(*)::int AS so_luot_danh_gia
      FROM danh_gia WHERE id_khachsan = ks.id_khachsan AND trang_thai_duyet = 'HIEN_THI'
    ) dg_stats ON TRUE
    LEFT JOIN LATERAL (
      SELECT json_agg(ti.ten_tienich ORDER BY ti.ten_tienich) AS tien_ich
      FROM khach_san_tien_ich ksti
      INNER JOIN tien_ich ti ON ti.id_tienich = ksti.id_tienich
      WHERE ksti.id_khachsan = ks.id_khachsan
    ) ti_agg ON TRUE
    WHERE ${conditions.join(' AND ')}
    ORDER BY ${orderClause}
    LIMIT ${limitParam}
  `;

  const result = await db.query(sql, params);

  return {
    mode: searchMode,
    extracted_filters: filters,
    hotels: result.rows.map((r) => ({
      ...r,
      id_khachsan: Number(r.id_khachsan),
      gia_thap_nhat: Number(r.gia_thap_nhat),
      gia_cao_nhat: Number(r.gia_cao_nhat),
      diem_danh_gia: Number(r.diem_danh_gia),
      similarity_score: Number(r.similarity_score || 0),
    })),
  };
};

module.exports = {
  ensureEmbeddingColumn,
  buildHotelSemanticText,
  syncSingleHotelEmbedding,
  syncAllHotelEmbeddings,
  extractFiltersFromNaturalQuery,
  runSemanticHotelSearch,
};
