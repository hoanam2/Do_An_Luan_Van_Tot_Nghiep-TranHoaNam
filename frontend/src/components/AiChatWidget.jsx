import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquareHeart, Send, Sparkles, X, MapPin } from 'lucide-react';
import apiClient, { getErrorMessage } from '../api/client';
import { formatCurrency } from '../utils/format';

export default function AiChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: 'Xin chào! Tôi là trợ lý AI của StayWithUs. Bạn muốn tìm khách sạn ở đâu, ngân sách khoảng bao nhiêu hay cần tiện ích gì (hồ bơi, gần biển, yên tĩnh...)?',
      hotels: [],
    },
  ]);

  const sendMessage = async (textToSend) => {
    const text = String(textToSend ?? input).trim();
    if (!text || loading) return;

    const nextHistory = [...messages, { role: 'user', text }];
    setMessages(nextHistory);
    setInput('');
    setLoading(true);

    try {
      const res = await apiClient.post('/ai/chat', {
        message: text,
        history: nextHistory.slice(-6).map((m) => ({ role: m.role, text: m.text })),
      });
      const payload = res.data?.data || {};
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: payload.reply || 'Tôi chưa tìm thấy gợi ý phù hợp.',
          hotels: payload.suggested_hotels || [],
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: `Lỗi kết nối AI: ${getErrorMessage(err)}`, hotels: [] },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {open && (
        <div className="ai-drawer">
          <div className="ai-drawer-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}>
              <Sparkles size={18} /> Trợ lý đặt phòng AI (Gemini RAG)
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}
              aria-label="Đóng chat"
            >
              <X size={18} />
            </button>
          </div>

          <div className="ai-messages">
            {messages.map((m, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div className={`msg-bubble ${m.role === 'user' ? 'msg-user' : 'msg-assistant'}`}>
                  {m.text}
                </div>
                {Array.isArray(m.hotels) && m.hotels.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {m.hotels.slice(0, 3).map((h) => (
                      <Link
                        key={h.id_khachsan}
                        to={`/hotels/${h.id_khachsan}`}
                        onClick={() => setOpen(false)}
                        style={{
                          background: '#fff',
                          border: '1px solid #ccfbf1',
                          borderRadius: 10,
                          padding: '8px 10px',
                          fontSize: 12.5,
                          display: 'block',
                        }}
                      >
                        <div style={{ fontWeight: 700, color: '#0f766e' }}>
                          {h.ten_khachsan} {h.hang_sao ? `(${h.hang_sao}★)` : ''}
                        </div>
                        <div style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <MapPin size={12} /> {h.quan_huyen}, {h.tinh_thanh}
                        </div>
                        <div style={{ fontWeight: 700, marginTop: 2 }}>
                          Từ {formatCurrency(h.gia_thap_nhat)} / đêm
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {loading && <div className="msg-bubble msg-assistant">Đang phân tích và tìm khách sạn phù hợp...</div>}
          </div>

          <form
            className="ai-input-bar"
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
          >
            <input
              className="input"
              placeholder="Ví dụ: Resort gần biển Đà Nẵng dưới 2 triệu..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button className="btn btn-primary btn-sm" type="submit" disabled={loading}>
              <Send size={15} />
            </button>
          </form>
        </div>
      )}

      <button className="ai-fab" onClick={() => setOpen((v) => !v)}>
        <MessageSquareHeart size={18} />
        <span>Hỏi Trợ lý AI</span>
      </button>
    </>
  );
}
