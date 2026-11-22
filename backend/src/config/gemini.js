const path = require('path');
const { GoogleGenAI } = require('@google/genai');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const GEMINI_EMBEDDING_MODEL = process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001';

let aiClient = null;

/**
 * Khởi tạo lazy client Gemini AI để server vẫn chạy bình thường khi chưa cấu hình API key.
 * @returns {GoogleGenAI}
 */
const getGeminiClient = () => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('Thiếu biến môi trường GEMINI_API_KEY trong file .env');
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return aiClient;
};

/**
 * Sinh văn bản hoặc JSON có cấu trúc từ Gemini (dùng cho chatbot tư vấn, tóm tắt đánh giá, phân tích truy vấn).
 * @param {string} prompt
 * @param {Object} [options]
 * @param {string} [options.model]
 * @param {string} [options.systemInstruction]
 * @param {number} [options.temperature]
 * @param {string} [options.responseMimeType] - Ví dụ: 'application/json'
 * @returns {Promise<string>}
 */
const generateText = async (prompt, options = {}) => {
  const ai = getGeminiClient();
  const {
    model = GEMINI_MODEL,
    systemInstruction,
    temperature = 0.4,
    responseMimeType,
  } = options;

  const config = { temperature };
  if (systemInstruction) {
    config.systemInstruction = systemInstruction;
  }
  if (responseMimeType) {
    config.responseMimeType = responseMimeType;
  }

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config,
  });

  return response.text || '';
};

/**
 * Tạo vector embedding (mảng số thực float) từ văn bản bằng Gemini.
 * Kết quả trả về dùng trực tiếp làm tham số REAL[] cho hàm PostgreSQL cosine_similarity(REAL[], REAL[]).
 * @param {string} text
 * @param {Object} [options]
 * @param {string} [options.model]
 * @param {number} [options.outputDimensionality]
 * @returns {Promise<number[]>}
 */
const createEmbedding = async (text, options = {}) => {
  if (!text || typeof text !== 'string' || !text.trim()) {
    throw new Error('Nội dung đầu vào để tạo embedding không được để trống.');
  }

  const ai = getGeminiClient();
  const { model = GEMINI_EMBEDDING_MODEL, outputDimensionality } = options;

  const request = {
    model,
    contents: text.trim(),
  };

  if (outputDimensionality) {
    request.config = { outputDimensionality };
  }

  const response = await ai.models.embedContent(request);
  const values = response?.embeddings?.[0]?.values || response?.embedding?.values;

  if (!Array.isArray(values) || values.length === 0) {
    throw new Error('Không nhận được vector embedding hợp lệ từ Gemini API.');
  }

  return values;
};

/**
 * Kiểm tra mảng vector hợp lệ trước khi truyền vào truy vấn PostgreSQL REAL[].
 * @param {number[]} vector
 * @returns {number[]}
 */
const validateVector = (vector) => {
  if (!Array.isArray(vector) || vector.length === 0) {
    throw new Error('Vector embedding không hợp lệ.');
  }
  return vector.map((v) => {
    const num = Number(v);
    if (!Number.isFinite(num)) {
      throw new Error('Vector embedding chứa giá trị không phải số thực hợp lệ.');
    }
    return num;
  });
};

module.exports = {
  GEMINI_MODEL,
  GEMINI_EMBEDDING_MODEL,
  getGeminiClient,
  generateText,
  createEmbedding,
  validateVector,
};
