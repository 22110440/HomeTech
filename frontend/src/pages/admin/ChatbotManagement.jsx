import { useEffect, useState, useMemo } from 'react';
import styles from './ChatbotManagement.module.css';
import { chatbotAPI } from '../../services/api';

const emptyRuleForm = {
  keyword: '',
  response: '',
  active: true,
  fallback: false,
};

export default function ChatbotManagement() {
  // Settings state
  const [settings, setSettings] = useState({
    mode: 'RULES',
    geminiApiKey: '',
    geminiModel: 'gemini-2.5-flash',
    aiSystemInstruction: '',
  });
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsSubmitting, setSettingsSubmitting] = useState(false);
  const [settingsError, setSettingsError] = useState('');
  const [settingsSuccess, setSettingsSuccess] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);

  // Rules state
  const [rules, setRules] = useState([]);
  const [rulesLoading, setRulesLoading] = useState(true);
  const [rulesError, setRulesError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [ruleForm, setRuleForm] = useState(emptyRuleForm);
  const [editingRuleId, setEditingRuleId] = useState(null);
  const [ruleSubmitting, setRuleSubmitting] = useState(false);

  // Load all configurations on mount
  useEffect(() => {
    loadSettings();
    loadRules();
  }, []);

  const loadSettings = async () => {
    try {
      setSettingsLoading(true);
      const data = await chatbotAPI.getSettings();
      if (data) {
        setSettings({
          mode: data.mode || 'RULES',
          geminiApiKey: data.geminiApiKey || '',
          geminiModel: data.geminiModel || 'gemini-2.5-flash',
          aiSystemInstruction: data.aiSystemInstruction || '',
        });
      }
    } catch (err) {
      console.error('Failed to load settings', err);
      setSettingsError('Không thể tải cấu hình chatbot.');
    } finally {
      setSettingsLoading(false);
    }
  };

  const loadRules = async () => {
    try {
      setRulesLoading(true);
      const data = await chatbotAPI.getRules();
      setRules(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load rules', err);
      setRulesError('Không thể tải danh sách từ khóa.');
    } finally {
      setRulesLoading(false);
    }
  };

  // Handle settings update
  const handleSettingsSubmit = async (e) => {
    e.preventDefault();
    setSettingsSubmitting(true);
    setSettingsError('');
    setSettingsSuccess('');
    try {
      await chatbotAPI.updateSettings(settings);
      setSettingsSuccess('Lưu cấu hình chatbot thành công!');
      setTimeout(() => setSettingsSuccess(''), 3000);
    } catch (err) {
      console.error('Failed to save settings', err);
      setSettingsError(err.response?.data?.message || 'Lưu cấu hình thất bại. Vui lòng thử lại.');
    } finally {
      setSettingsSubmitting(false);
    }
  };

  // Rules matching filter
  const filteredRules = useMemo(() => {
    if (!searchTerm.trim()) return rules;
    const term = searchTerm.toLowerCase();
    return rules.filter(
      (rule) =>
        (rule.keyword && rule.keyword.toLowerCase().includes(term)) ||
        (rule.response && rule.response.toLowerCase().includes(term))
    );
  }, [rules, searchTerm]);

  // Modal actions
  const openCreateModal = () => {
    setRuleForm(emptyRuleForm);
    setEditingRuleId(null);
    setShowModal(true);
  };

  const openEditModal = (rule) => {
    setEditingRuleId(rule.id);
    setRuleForm({
      keyword: rule.keyword || '',
      response: rule.response || '',
      active: rule.active,
      fallback: rule.fallback,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    if (ruleSubmitting) return;
    setShowModal(false);
    setRuleForm(emptyRuleForm);
    setEditingRuleId(null);
  };

  const handleRuleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setRuleForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleRuleSubmit = async (e) => {
    e.preventDefault();
    setRuleSubmitting(true);
    setRulesError('');
    try {
      const payload = {
        keyword: ruleForm.fallback ? null : ruleForm.keyword.trim(),
        response: ruleForm.response.trim(),
        active: ruleForm.active,
        fallback: ruleForm.fallback,
      };

      if (editingRuleId) {
        await chatbotAPI.updateRule(editingRuleId, payload);
      } else {
        await chatbotAPI.createRule(payload);
      }
      await loadRules();
      closeModal();
    } catch (err) {
      console.error('Failed to save rule', err);
      alert(err.response?.data?.message || 'Có lỗi xảy ra khi lưu quy tắc.');
    } finally {
      setRuleSubmitting(false);
    }
  };

  const handleDeleteRule = async (rule) => {
    const confirmMsg = rule.fallback
      ? 'Bạn có chắc chắn muốn xóa quy tắc Mặc định (Fallback) này?'
      : `Bạn có chắc chắn muốn xóa quy tắc cho từ khóa "${rule.keyword}"?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await chatbotAPI.deleteRule(rule.id);
      setRules((prev) => prev.filter((item) => item.id !== rule.id));
    } catch (err) {
      alert(err.response?.data?.message || 'Xóa quy tắc thất bại.');
    }
  };

  const handleToggleActiveRule = async (rule) => {
    try {
      const payload = {
        keyword: rule.keyword,
        response: rule.response,
        active: !rule.active,
        fallback: rule.fallback,
      };
      await chatbotAPI.updateRule(rule.id, payload);
      setRules((prev) =>
        prev.map((item) => (item.id === rule.id ? { ...item, active: !item.active } : item))
      );
    } catch {
      alert('Không thể thay đổi trạng thái quy tắc.');
    }
  };

  if (settingsLoading || rulesLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Đang tải cấu hình chatbot...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Trợ lý Chatbot Tự Động 🤖</h1>
          <p className={styles.subtitle}>
            Thiết lập phản hồi tự động cho khách hàng bằng hệ thống từ khóa và tích hợp AI thông minh
          </p>
        </div>
      </div>

      <div className={styles.layout}>
        {/* Left Side: Settings Panel */}
        <div className={styles.settingsCard}>
          <h2 className={styles.sectionTitle}>⚙️ Cấu Hình Chatbot</h2>
          {settingsError && <div className={styles.errorText}>{settingsError}</div>}
          {settingsSuccess && <div className={styles.successText}>{settingsSuccess}</div>}

          <form onSubmit={handleSettingsSubmit} className={styles.settingsForm}>
            <div className={styles.formGroup}>
              <label>Chế độ hoạt động</label>
              <select
                value={settings.mode}
                onChange={(e) => setSettings({ ...settings, mode: e.target.value })}
                className={styles.select}
              >
                <option value="DISABLED">❌ Tắt chatbot tự động</option>
                <option value="RULES">📝 Chỉ dùng quy tắc từ khóa (Rule-based)</option>
                <option value="AI">🧠 Chỉ trả lời bằng AI (Google Gemini)</option>
                <option value="HYBRID">⚡ Kết hợp (Ưu tiên từ khóa → AI Gemini)</option>
              </select>
              <p className={styles.hintText}>
                {settings.mode === 'DISABLED' && 'Chatbot sẽ không tự động trả lời khách hàng.'}
                {settings.mode === 'RULES' && 'Hệ thống chỉ trả lời khi khớp chính xác từ khóa được cài đặt.'}
                {settings.mode === 'AI' && 'Hệ thống dùng AI Google Gemini phản hồi mọi thắc mắc của khách hàng.'}
                {settings.mode === 'HYBRID' && 'Ưu tiên tìm từ khóa khớp để phản hồi nhanh. Nếu không tìm thấy, AI Gemini sẽ trả lời.'}
              </p>
            </div>

            {(settings.mode === 'AI' || settings.mode === 'HYBRID') && (
              <>
                <div className={styles.formGroup}>
                  <label>Google Gemini API Key</label>
                  <div className={styles.apiKeyWrapper}>
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={settings.geminiApiKey}
                      onChange={(e) => setSettings({ ...settings, geminiApiKey: e.target.value })}
                      placeholder="Nhập API Key Gemini"
                      className={styles.input}
                      required={settings.mode === 'AI' || settings.mode === 'HYBRID'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className={styles.showKeyBtn}
                    >
                      {showApiKey ? 'Ẩn' : 'Hiện'}
                    </button>
                  </div>
                  <p className={styles.hintText}>
                    Lấy API key tại Google AI Studio (Miễn phí 15 requests/phút).
                  </p>
                </div>

                <div className={styles.formGroup}>
                  <label>Chọn Model Gemini</label>
                  <select
                    value={settings.geminiModel}
                    onChange={(e) => setSettings({ ...settings, geminiModel: e.target.value })}
                    className={styles.select}
                  >
                    <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                    <option value="gemini-3.5-flash">Gemini 3.5 Flash</option>
                    <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite</option>
                    <option value="gemini-2.5-flash-lite">Gemini 2.5 Flash Lite</option>
                  </select>
                  <p className={styles.hintText}>
                    Chọn model chính để xử lý câu hỏi của khách hàng. Khi model này hết lượt request, hệ thống sẽ tự động thử các model dự phòng khác.
                  </p>
                </div>

                <div className={styles.formGroup}>
                  <label>Chỉ dẫn hệ thống cho AI (System Prompt)</label>
                  <textarea
                    value={settings.aiSystemInstruction}
                    onChange={(e) => setSettings({ ...settings, aiSystemInstruction: e.target.value })}
                    placeholder="Chỉ dẫn cho AI biết mình là ai, trả lời như thế nào..."
                    className={styles.textarea}
                    rows={6}
                    required={settings.mode === 'AI' || settings.mode === 'HYBRID'}
                  />
                  <p className={styles.hintText}>
                    Prompt định hướng tính cách, ngữ cảnh cho AI. Ví dụ: quy định ngôn ngữ (Tiếng Việt), thái độ hỗ trợ, thông tin giới hạn của shop...
                  </p>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={settingsSubmitting}
              className={styles.submitBtn}
            >
              {settingsSubmitting ? 'Đang lưu...' : 'Lưu cấu hình'}
            </button>
          </form>
        </div>

        {/* Right Side: Rules Management */}
        <div className={styles.rulesCard}>
          <div className={styles.rulesHeader}>
            <h2 className={styles.sectionTitle}>💬 Kịch Bản Phản Hồi Nhanh</h2>
            <button onClick={openCreateModal} className={styles.createBtn}>
              + Tạo kịch bản mới
            </button>
          </div>

          <div className={styles.controls}>
            <div className={styles.searchBox}>
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className={styles.searchIcon}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 10-14 0 7 7 0 0014 0z" />
              </svg>
              <input
                type="text"
                placeholder="Tìm kiếm từ khóa hoặc câu trả lời..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={styles.searchInput}
              />
            </div>
          </div>

          {rulesError && <div className={styles.errorText}>{rulesError}</div>}

          {filteredRules.length === 0 ? (
            <div className={styles.emptyState}>
              <p>Chưa có kịch bản từ khóa nào được cấu hình</p>
            </div>
          ) : (
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th style={{ width: '30%' }}>Từ khóa</th>
                    <th style={{ width: '45%' }}>Phản hồi tự động</th>
                    <th style={{ width: '10%' }}>Bật/Tắt</th>
                    <th style={{ width: '15%' }}>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRules.map((rule) => (
                    <tr key={rule.id}>
                      <td>
                        {rule.fallback ? (
                          <span className={styles.fallbackBadge}>Mặc định (Fallback)</span>
                        ) : (
                          <div className={styles.keywordList}>
                            {rule.keyword.split(',').map((kw, idx) => (
                              <span key={idx} className={styles.keywordBadge}>
                                {kw.trim()}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td>
                        <div className={styles.responseText}>{rule.response}</div>
                      </td>
                      <td>
                        <label className={styles.switch}>
                          <input
                            type="checkbox"
                            checked={rule.active}
                            onChange={() => handleToggleActiveRule(rule)}
                          />
                          <span className={styles.slider}></span>
                        </label>
                      </td>
                      <td>
                        <div className={styles.actionGroup}>
                          <button onClick={() => openEditModal(rule)} className={styles.editBtn}>
                            Sửa
                          </button>
                          <button onClick={() => handleDeleteRule(rule)} className={styles.deleteBtn}>
                            Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Rules Create/Edit Modal */}
      {showModal && (
        <div className={styles.modalOverlay} onClick={closeModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>{editingRuleId ? 'Cập Nhật Kịch Bản' : 'Thêm Kịch Bản Mới'}</h3>
              <button onClick={closeModal} className={styles.closeBtn}>
                ×
              </button>
            </div>

            <form onSubmit={handleRuleSubmit} className={styles.modalForm}>
              <div className={styles.formGroup}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    name="fallback"
                    checked={ruleForm.fallback}
                    onChange={handleRuleInputChange}
                  />
                  Đặt làm tin nhắn Mặc định (Fallback)
                </label>
                <p className={styles.hintText}>
                  Nếu được chọn, tin nhắn này sẽ tự động gửi khi khách hàng nhập câu hỏi không khớp bất kỳ từ khóa nào (và không dùng AI). Chỉ nên có 1 tin nhắn mặc định.
                </p>
              </div>

              {!ruleForm.fallback && (
                <div className={styles.formGroup}>
                  <label>Từ khóa kích hoạt</label>
                  <input
                    type="text"
                    name="keyword"
                    value={ruleForm.keyword}
                    onChange={handleRuleInputChange}
                    placeholder="VD: gia, bao nhieu, chi phi (cách nhau bằng dấu phẩy)"
                    className={styles.input}
                    required={!ruleForm.fallback}
                  />
                  <p className={styles.hintText}>
                    Tin nhắn của khách hàng chứa một trong các từ khóa này sẽ kích hoạt phản hồi.
                  </p>
                </div>
              )}

              <div className={styles.formGroup}>
                <label>Nội dung câu trả lời tự động</label>
                <textarea
                  name="response"
                  value={ruleForm.response}
                  onChange={handleRuleInputChange}
                  placeholder="Nhập nội dung phản hồi tự động của chatbot..."
                  className={styles.textarea}
                  rows={5}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    name="active"
                    checked={ruleForm.active}
                    onChange={handleRuleInputChange}
                  />
                  Kích hoạt kịch bản này
                </label>
              </div>

              <div className={styles.modalActions}>
                <button type="submit" disabled={ruleSubmitting} className={styles.modalSubmitBtn}>
                  {ruleSubmitting ? 'Đang lưu...' : editingRuleId ? 'Cập nhật' : 'Tạo mới'}
                </button>
                <button type="button" onClick={closeModal} className={styles.modalCancelBtn}>
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
