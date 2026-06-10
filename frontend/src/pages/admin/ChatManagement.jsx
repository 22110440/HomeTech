import { useEffect, useRef, useState } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { chatAPI } from '../../services/api';
import { WS_ENDPOINT } from '../../config/runtime';
import styles from './ChatManagement.module.css';

/* ============ Format time ============ */
const formatTime = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
};

/* ============ Fetch file with auth (top-level) ============ */
const fetchFileWithAuth = async (messageId) => {
  const token = localStorage.getItem('accessToken');
  const res = await fetch(`/api/chat/messages/${messageId}/file`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Unauthorized');
  const blob = await res.blob();
  return URL.createObjectURL(blob);
};

/* ============ Message Item Component ============ */
function MessageItem({ m, onPreviewImage }) {
  const [fileUrl, setFileUrl] = useState(null);

  useEffect(() => {
    let active = true;
    let objectUrl = null;

    const load = async () => {
      try {
        const url = await fetchFileWithAuth(m.id);
        objectUrl = url;
        if (active) setFileUrl(url);
      } catch (e) {
        console.error('Không tải được file', e);
      }
    };

    if (m.hasFile) load();

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [m.id, m.hasFile]);

  const isSupport = m.senderType === 'ADMIN' || m.senderType === 'BOT';
  const isBot = m.senderType === 'BOT';

  return (
    <div className={
      isBot
        ? `${styles.messageAdmin} ${styles.messageBot}`
        : isSupport
        ? styles.messageAdmin
        : styles.messageCustomer
    }>
      {/* Avatar cho customer */}
      {!isSupport && (
        <div className={styles.msgAvatar}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
      )}

      <div className={styles.bubble}>
        {/* Bot badge indicator */}
        {isBot && (
          <div className={styles.botBadge}>HomeTech Bot 🤖</div>
        )}

        {/* Text content */}
        {m.content && <div className={styles.content}>{m.content}</div>}

        {/* Inline image preview */}
        {m.hasFile && fileUrl && m.fileContentType?.startsWith('image/') && (
          <div className={styles.msgImageWrapper}>
            <img
              src={fileUrl}
              alt={m.fileName}
              className={styles.msgImage}
              onClick={() => onPreviewImage?.(fileUrl)}
            />
          </div>
        )}

        {/* Other file types */}
        {m.hasFile && fileUrl && !m.fileContentType?.startsWith('image/') && (
          <a href={fileUrl} download={m.fileName} className={styles.msgFileLink}>
            📎 {m.fileName}
          </a>
        )}

        {/* Loading state for file */}
        {m.hasFile && !fileUrl && (
          <div className={styles.fileLoading}>⏳ Đang tải file...</div>
        )}

        <div className={styles.timestamp}>{formatTime(m.sentAt)}</div>
      </div>

      {/* Avatar cho admin */}
      {m.senderType === 'ADMIN' && (
        <div className={`${styles.msgAvatar} ${styles.msgAvatarAdmin}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
      )}

      {/* Avatar cho bot */}
      {m.senderType === 'BOT' && (
        <div className={`${styles.msgAvatar} ${styles.msgAvatarBot}`} title="HomeTech Bot 🤖">
          🤖
        </div>
      )}
    </div>
  );
}

/* ============ Main Component ============ */
function ChatManagement({ initialUserId }) {
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [file, setFile] = useState(null);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [previewImage, setPreviewImage] = useState(null);

  const stompClientRef = useRef(null);
  const subscriptionRef = useRef(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, activeConversation]);

  /* ========= Load conversations ========= */
  useEffect(() => {
    const fetchConversations = async () => {
      setLoadingConversations(true);
      setError('');
      try {
        const data = await chatAPI.getAdminConversations();
        const list = Array.isArray(data) ? data : data?.data || [];
        const sorted = [...list].sort(
          (a, b) => Number(Boolean(b.handoffRequested)) - Number(Boolean(a.handoffRequested))
            || new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0),
        );
        setConversations(sorted);

        if (initialUserId) {
          const target = sorted.find(
            (c) => String(c.userId) === String(initialUserId),
          );
          if (target) {
            await handleSelectConversation(target);
            return;
          }
        }

        if (sorted.length > 0 && !activeConversation) {
          await handleSelectConversation(sorted[0]);
        }
      } catch (e) {
        console.error('Failed to load conversations', e);
        setError('Không thể tải danh sách cuộc trò chuyện.');
      } finally {
        setLoadingConversations(false);
      }
    };

    fetchConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialUserId]);

  /* ========= Ensure conversation for user ========= */
  useEffect(() => {
    const ensureConversationForUser = async () => {
      if (!initialUserId) return;
      try {
        const data = await chatAPI.getOrCreateAdminConversationForUser(initialUserId);
        const conv = data?.data || data;
        if (!conv?.id) return;

        setConversations((prev) => {
          const exists = prev.some((c) => c.id === conv.id);
          if (exists) {
            return prev.map((c) => (c.id === conv.id ? { ...c, ...conv } : c));
          }
          return [conv, ...prev];
        });

        await handleSelectConversation(conv);
      } catch (e) {
        console.error('Failed to ensure conversation for user', e);
        setError('Không thể tạo cuộc trò chuyện với khách hàng này.');
      }
    };

    ensureConversationForUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialUserId]);

  /* ========= WebSocket ========= */
  const connectWebSocket = (conversationId) => {
    if (!conversationId) return;

    if (!stompClientRef.current) {
      const client = new Client({
        webSocketFactory: () => new SockJS(WS_ENDPOINT),
        reconnectDelay: 5000,
        debug: () => {},
      });

      client.onConnect = () => {
        subscribeToConversation(conversationId);
      };

      client.onStompError = (frame) => {
        console.error('STOMP error', frame);
      };

      client.activate();
      stompClientRef.current = client;
    } else if (stompClientRef.current.connected) {
      subscribeToConversation(conversationId);
    }
  };

  const subscribeToConversation = (conversationId) => {
    if (!stompClientRef.current || !stompClientRef.current.connected) return;

    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
      subscriptionRef.current = null;
    }

    subscriptionRef.current = stompClientRef.current.subscribe(
      `/topic/conversations/${conversationId}`,
      (message) => {
        try {
          const body = JSON.parse(message.body);
          setMessages((prev) => {
            if (prev.some((m) => m.id === body.id)) {
              return prev;
            }
            return [...prev, body];
          });
          if (body.handoffRequested) {
            setActiveConversation((prev) =>
              prev?.id === conversationId ? { ...prev, handoffRequested: true } : prev
            );
            setConversations((prev) =>
              prev.map((c) =>
                c.id === conversationId ? { ...c, handoffRequested: true } : c
              )
            );
          }
        } catch (e) {
          console.error('Invalid message payload', e);
        }
      },
    );
  };

  useEffect(
    () => () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
      if (stompClientRef.current) {
        stompClientRef.current.deactivate();
        stompClientRef.current = null;
      }
    },
    [],
  );

  /* ========= Load messages ========= */
  const loadMessages = async (conversation) => {
    if (!conversation?.id) return;
    setLoadingMessages(true);
    setError('');
    try {
      const data = await chatAPI.getConversationMessages(conversation.id);
      const list = Array.isArray(data) ? data : data?.data || [];
      setMessages(list);
      connectWebSocket(conversation.id);

      // Mark messages as read for admin
      try {
        await chatAPI.markAsReadForAdmin(conversation.id);
        // Update unread count in sidebar
        setConversations((prev) =>
          prev.map((c) =>
            c.id === conversation.id ? { ...c, unreadCount: 0 } : c
          )
        );
      } catch {
        // Silently fail
      }
    } catch (e) {
      console.error('Failed to load messages', e);
      setError('Không thể tải tin nhắn.');
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSelectConversation = async (conversation) => {
    setActiveConversation(conversation);
    await loadMessages(conversation);
  };

  /* ========= Send message ========= */
  const handleSend = async (e) => {
    e.preventDefault();
    if ((!input.trim() && !file) || !activeConversation?.id) return;
    try {
      await chatAPI.sendMessage(activeConversation.id, input.trim() || null, file);
      setActiveConversation((prev) =>
        prev ? { ...prev, handoffRequested: false, handoffReason: null, handoffRequestedAt: null } : prev
      );
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConversation.id
            ? { ...c, handoffRequested: false, handoffReason: null, handoffRequestedAt: null }
            : c
        )
      );
      setInput('');
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (e) {
      console.error('Failed to send message', e);
      setError('Không thể gửi tin nhắn.');
    }
  };

  /* ========= Filter conversations ========= */
  const filteredConversations = conversations.filter((c) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const name = (c.username || '').toLowerCase();
    const id = String(c.userId || '');
    return name.includes(term) || id.includes(term);
  });

  /* ========= Render ========= */
  return (
    <div className={styles.container}>
      {/* SIDEBAR */}
      <div className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <h2>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20" style={{ verticalAlign: 'middle', marginRight: 8 }}>
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            Chat khách hàng
          </h2>
          <p>{conversations.length} cuộc trò chuyện</p>
        </div>

        {/* Search */}
        <div className={styles.searchBox}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Tìm khách hàng..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className={styles.sidebarBody}>
          {loadingConversations && <div className={styles.placeholder}>Đang tải...</div>}
          {!loadingConversations && filteredConversations.length === 0 && (
            <div className={styles.placeholder}>
              {searchTerm ? 'Không tìm thấy kết quả.' : 'Chưa có cuộc trò chuyện nào.'}
            </div>
          )}
          {!loadingConversations &&
            filteredConversations.map((c) => {
              const isActive = activeConversation?.id === c.id;
              const displayName = c.username || 'Khách hàng';
              const unread = c.unreadCount || 0;
              return (
                <button
                  key={c.id}
                  type="button"
                  className={`${styles.conversationItem} ${
                    isActive ? styles.conversationItemActive : ''
                  } ${c.handoffRequested ? styles.conversationItemHandoff : ''}`}
                  onClick={() => handleSelectConversation(c)}
                >
                  <div className={styles.convAvatar}>
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                  <div className={styles.convInfo}>
                    <div className={styles.conversationName}>{displayName}</div>
                    <div className={styles.conversationMeta}>
                      <span>ID: {c.userId ?? 'N/A'}</span>
                      <span>· {formatTime(c.lastMessageAt)}</span>
                    </div>
                    {c.handoffRequested && (
                      <div className={styles.handoffInline}>Cần nhân viên xử lý</div>
                    )}
                  </div>
                  {unread > 0 && (
                    <span className={styles.unreadBadge}>
                      {unread > 99 ? '99+' : unread}
                    </span>
                  )}
                </button>
              );
            })}
        </div>
      </div>

      {/* CHAT PANEL */}
      <div className={styles.chatPanel}>
        {activeConversation ? (
          <>
            {/* Header */}
            <div className={styles.chatHeader}>
              <div className={styles.chatHeaderInfo}>
                <div className={styles.chatHeaderAvatar}>
                  {(activeConversation.username || 'K').charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3>{activeConversation.username || 'Khách hàng'}</h3>
                  <p>ID: {activeConversation.userId ?? 'N/A'} · Trao đổi trực tiếp</p>
                </div>
              </div>
              {activeConversation.handoffRequested && (
                <div className={styles.handoffNotice}>
                  <strong>Bot đã chuyển nhân viên.</strong>
                  <span>{activeConversation.handoffReason || 'Khách cần hỗ trợ trực tiếp.'}</span>
                </div>
              )}
            </div>

            {/* Messages */}
            <div className={styles.messages}>
              {loadingMessages && <div className={styles.systemMessage}>Đang tải tin nhắn...</div>}
              {!loadingMessages && messages.length === 0 && (
                <div className={styles.emptyMessages}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="48" height="48">
                    <path d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.338-3.123C3.486 15.732 3 13.938 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <p>Chưa có tin nhắn. Hãy gửi tin nhắn để bắt đầu trò chuyện!</p>
                </div>
              )}
              {!loadingMessages &&
                messages.map((m) => (
                  <MessageItem
                    key={m.id}
                    m={m}
                    onPreviewImage={setPreviewImage}
                  />
                ))}
              <div ref={messagesEndRef} />
            </div>

            {/* File preview */}
            {file && (
              <div className={styles.filePreview}>
                <span className={styles.filePreviewName}>📎 {file.name}</span>
                <button
                  type="button"
                  className={styles.filePreviewRemove}
                  onClick={() => {
                    setFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                >
                  ✕
                </button>
              </div>
            )}

            {/* Input */}
            <form className={styles.inputArea} onSubmit={handleSend}>
              <button
                type="button"
                className={styles.attachBtn}
                onClick={() => fileInputRef.current?.click()}
                title="Đính kèm file"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
                </svg>
              </button>
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={(e) => setFile(e.target.files[0])}
              />
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Nhập tin nhắn để trả lời khách hàng..."
              />
              <button type="submit" className={styles.sendBtn}>
                <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              </button>
            </form>
          </>
        ) : (
          <div className={styles.emptyState}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="56" height="56">
              <path d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.338-3.123C3.486 15.732 3 13.938 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <h3>Chọn một cuộc trò chuyện</h3>
            <p>Chọn khách hàng ở bên trái để bắt đầu chat.</p>
          </div>
        )}

        {error && <div className={styles.error}>{error}</div>}
      </div>

      {/* Fullscreen image preview */}
      {previewImage && (
        <div
          className={styles.previewOverlay}
          onClick={() => setPreviewImage(null)}
        >
          <img
            src={previewImage}
            alt="Preview"
            className={styles.previewImg}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

export default ChatManagement;
