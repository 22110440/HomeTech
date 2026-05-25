import { useEffect, useRef, useState } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { WS_ENDPOINT } from '../config/runtime';
import styles from './ChatWidget.module.css';

const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // preview ảnh fullscreen
  const [previewImage, setPreviewImage] = useState(null);

  const stompClientRef = useRef(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  /* ================= Utils ================= */

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages, isOpen]);

  const fetchWithAuth = async (url, options = {}) => {
    const token = localStorage.getItem('accessToken');
    const res = await fetch(url, {
      ...options,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    });

    const rawText = await res.text();
    const payload = rawText ? (() => {
      try {
        return JSON.parse(rawText);
      } catch {
        return null;
      }
    })() : null;

    if (!res.ok) {
      throw new Error(
        payload?.message ||
          payload?.error ||
          `Request failed with status ${res.status}`
      );
    }

    return payload || {};
  };

  const fetchFileWithAuth = async (messageId) => {
    const token = localStorage.getItem('accessToken');
    const res = await fetch(`/api/chat/messages/${messageId}/file`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Unauthorized');
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  };

  /* ================= Load ================= */

  const loadConversationAndMessages = async () => {
    setLoading(true);
    try {
      const conv = await fetchWithAuth('/api/chat/conversations/me');
      setConversation(conv);
      const msgs = await fetchWithAuth(
        `/api/chat/conversations/${conv.id}/messages`
      );
      setMessages(msgs);
    } finally {
      setLoading(false);
    }
  };

  const loadUnreadCount = async () => {
    try {
      const res = await fetchWithAuth('/api/chat/unread-count');
      setUnreadCount(res?.count ?? res?.data?.count ?? 0);
    } catch {}
  };

  /* ================= WebSocket ================= */

  const connectWebSocket = (conversationId) => {
    if (stompClientRef.current) return;

    const client = new Client({
      webSocketFactory: () => new SockJS(WS_ENDPOINT),
      reconnectDelay: 5000,
      debug: () => {},
    });

    client.onConnect = () => {
      client.subscribe(`/topic/conversations/${conversationId}`, (msg) => {
        const body = JSON.parse(msg.body);
        setMessages((prev) =>
          prev.some((m) => m.id === body.id) ? prev : [...prev, body]
        );
      });
    };

    client.activate();
    stompClientRef.current = client;
  };

  useEffect(() => {
    loadUnreadCount();
    const t = setInterval(loadUnreadCount, 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (isOpen && conversation) connectWebSocket(conversation.id);
    return () => {
      stompClientRef.current?.deactivate();
      stompClientRef.current = null;
    };
  }, [isOpen, conversation?.id]);

  /* ================= Actions ================= */

  const handleToggleOpen = async () => {
    const open = !isOpen;
    setIsOpen(open);

    if (open && !conversation) await loadConversationAndMessages();

    if (open) {
      try {
        await fetchWithAuth('/api/chat/mark-read', { method: 'POST' });
        setUnreadCount(0);
      } catch {}
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if ((!input.trim() && !file) || !conversation) return;

    const formData = new FormData();
    formData.append('conversationId', conversation.id);
    if (input.trim()) formData.append('content', input.trim());
    if (file) formData.append('file', file);

    const token = localStorage.getItem('accessToken');
    await fetch('/api/chat/messages', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });

    setInput('');
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  /* ================= Message Item ================= */

  const MessageItem = ({ m }) => {
    const [fileUrl, setFileUrl] = useState(null);

    useEffect(() => {
      let revoked = false;

      const load = async () => {
        try {
          const url = await fetchFileWithAuth(m.id);
          if (!revoked) setFileUrl(url);
        } catch (e) {
          console.error('Không tải được file', e);
        }
      };

      if (m.hasFile) load();

      return () => {
        revoked = true;
        if (fileUrl) URL.revokeObjectURL(fileUrl);
      };
    }, [m.id]);

    return (
      <div
        className={
          m.senderType === 'CUSTOMER'
            ? styles.messageCustomer
            : styles.messageAdmin
        }
      >
        {/* Wrapper để xếp dọc text + ảnh */}
        <div
          className={styles.messageStack}
        >
          {/* 🔵 BUBBLE TEXT */}
          {m.content && (
            <div className={styles.bubble}>
              {m.content}
            </div>
          )}

          {/* 🖼️ ẢNH – NẰM DƯỚI TEXT */}
          {m.hasFile && fileUrl && m.fileContentType?.startsWith('image/') && (
            <div style={{ marginTop: '6px', maxWidth: '220px' }}>
              <img
                src={fileUrl}
                alt={m.fileName}
                style={{
                  width: '100%',
                  borderRadius: '14px',
                  display: 'block',
                  cursor: 'pointer',
                }}
                onClick={() => setPreviewImage(fileUrl)}
              />
            </div>
          )}

          {/* 📎 FILE KHÁC */}
          {m.hasFile && fileUrl && !m.fileContentType?.startsWith('image/') && (
            <a
              href={fileUrl}
              download={m.fileName}
              style={{ marginTop: '6px' }}
            >
              📎 {m.fileName}
            </a>
          )}
        </div>
      </div>
    );



  };

  /* ================= Render ================= */

  return (
    <div className={styles.container}>
      {isOpen && (
        <div className={styles.chatWindow}>
          <div className={styles.header}>
            <span>Hỗ trợ khách hàng</span>
            <button onClick={handleToggleOpen}>×</button>
          </div>

          <div className={styles.messages}>
            {loading && (
              <div className={styles.systemMessage}>
                Đang tải cuộc trò chuyện...
              </div>
            )}
            {!loading &&
              messages.map((m) => <MessageItem key={m.id} m={m} />)}
            <div ref={messagesEndRef} />
          </div>

          {file && (
            <div className={styles.filePreview}>
              <span className={styles.fileName}>📎 {file.name}</span>
              <button
                type="button"
                className={styles.removeFile}
                onClick={() => {
                  setFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
              >
                ✕
              </button>
            </div>
          )}

          <form className={styles.inputArea} onSubmit={handleSend}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Nhập tin nhắn..."
            />

            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={(e) => setFile(e.target.files[0])}
            />

            <button
              type="button"
              onClick={() => fileInputRef.current.click()}
            >
              📎
            </button>

            <button type="submit">Gửi</button>
          </form>
        </div>
      )}

      <button className={styles.fab} onClick={handleToggleOpen}>
        💬
        {unreadCount > 0 && (
          <span className={styles.badge}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* 🔍 PREVIEW ẢNH FULLSCREEN */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            cursor: 'zoom-out'
          }}
        >
          <img
            src={previewImage}
            alt="Preview"
            style={{
              maxWidth: '90%',
              maxHeight: '90%',
              borderRadius: '12px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
            }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};

export default ChatWidget;
