import { useCallback, useEffect, useRef, useState } from 'react';
import { Client } from '@stomp/stompjs';
import { Link, useLocation } from 'react-router-dom';
import SockJS from 'sockjs-client';
import { WS_ENDPOINT } from '../config/runtime';
import styles from './ChatWidget.module.css';

const quickPrompts = [
  'Tư vấn điện thoại dưới 10 triệu',
  'Kiểm tra đơn hàng của tôi',
  'Lịch sửa chữa gần đây',
  'Báo giá thay pin iPhone',
];

const INTERNAL_ROUTE_PATTERN =
  /(\/(?:product|repair-packages)\/\d+|\/(?:repair-booking|repair-packages|my-repair-schedules|orders|cart|favorites|trade-in))\b/g;

const renderMessageContent = (content, onRouteClick) => {
  if (!content) return null;

  const parts = [];
  let lastIndex = 0;

  for (const match of content.matchAll(INTERNAL_ROUTE_PATTERN)) {
    const route = match[0];
    const index = match.index ?? 0;

    if (index > lastIndex) {
      parts.push(content.slice(lastIndex, index));
    }

    parts.push(
      <Link
        key={`${route}-${index}`}
        to={route}
        className={styles.messageLink}
        onClick={onRouteClick}
      >
        {route}
      </Link>
    );
    lastIndex = index + route.length;
  }

  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }

  return parts.length ? parts : content;
};

const ChatWidget = () => {
  const location = useLocation();
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
  const messagesRef = useRef(null);
  const fileInputRef = useRef(null);

  /* ================= Utils ================= */

  const scrollToBottom = useCallback((behavior = 'smooth') => {
    const container = messagesRef.current;
    if (!container) return;
    container.scrollTo({
      top: container.scrollHeight,
      behavior,
    });
  }, []);

  useEffect(() => {
    if (isOpen) scrollToBottom('smooth');
  }, [messages, isOpen, scrollToBottom]);

  useEffect(() => {
    if (!isOpen) return;
    const frameId = requestAnimationFrame(() => scrollToBottom('auto'));
    return () => cancelAnimationFrame(frameId);
  }, [location.pathname, isOpen, scrollToBottom]);

  const fetchWithAuth = useCallback(async (url, options = {}) => {
    const token = localStorage.getItem('accessToken');
    const res = await fetch(url, {
      ...options,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }, []);

  const fetchFileWithAuth = useCallback(async (messageId) => {
    const token = localStorage.getItem('accessToken');
    const res = await fetch(`/api/chat/messages/${messageId}/file`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Unauthorized');
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  }, []);

  /* ================= Load ================= */

  const loadConversationAndMessages = useCallback(async () => {
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
  }, [fetchWithAuth]);

  const loadUnreadCount = useCallback(async () => {
    try {
      const res = await fetchWithAuth('/api/chat/unread-count');
      setUnreadCount(res?.count ?? res?.data?.count ?? 0);
    } catch (error) {
      console.warn('Không thể tải số tin nhắn chưa đọc', error);
    }
  }, [fetchWithAuth]);

  /* ================= WebSocket ================= */

  const connectWebSocket = useCallback((conversationId) => {
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
  }, []);

  useEffect(() => {
    loadUnreadCount();
    const t = setInterval(loadUnreadCount, 30000);
    return () => clearInterval(t);
  }, [loadUnreadCount]);

  useEffect(() => {
    if (isOpen && conversation) connectWebSocket(conversation.id);
    return () => {
      stompClientRef.current?.deactivate();
      stompClientRef.current = null;
    };
  }, [isOpen, conversation, connectWebSocket]);

  /* ================= Actions ================= */

  const handleToggleOpen = async () => {
    const open = !isOpen;
    setIsOpen(open);

    if (!open) return;

    try {
      await loadConversationAndMessages();
      await fetchWithAuth('/api/chat/mark-read', { method: 'POST' });
      setUnreadCount(0);
    } catch (error) {
      console.warn('Không thể đồng bộ cuộc trò chuyện', error);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if ((!input.trim() && !file) || !conversation) return;

    try {
      const formData = new FormData();
      formData.append('conversationId', conversation.id);
      if (input.trim()) formData.append('content', input.trim());
      if (file) formData.append('file', file);

      const token = localStorage.getItem('accessToken');
      const res = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) throw new Error(await res.text());

      setInput('');
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      console.error('Không thể gửi tin nhắn', error);
    }
  };

  const handleRouteLinkClick = useCallback(() => {
    requestAnimationFrame(() => scrollToBottom('auto'));
  }, [scrollToBottom]);

  /* ================= Message Item ================= */

  const MessageItem = ({ m }) => {
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

    return (
      <div
        className={
          m.senderType === 'CUSTOMER'
            ? styles.messageCustomer
            : m.senderType === 'BOT'
            ? styles.messageBot
            : styles.messageAdmin
        }
      >
        {/* Wrapper để xếp dọc text + ảnh */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems:
              m.senderType === 'CUSTOMER' ? 'flex-end' : 'flex-start',
          }}
        >
          {m.senderType === 'BOT' && (
            <span className={styles.senderName}>HomeTech Bot 🤖</span>
          )}
          {m.handoffRequested && (
            <span className={styles.handoffBadge}>Đã chuyển nhân viên</span>
          )}

          {/* 🔵 BUBBLE TEXT */}
          {m.content && (
            <div className={styles.bubble}>
              {renderMessageContent(m.content, handleRouteLinkClick)}
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

          <div className={styles.messages} ref={messagesRef}>
            {loading && (
              <div className={styles.systemMessage}>
                Đang tải cuộc trò chuyện...
              </div>
            )}
          {!loading &&
              messages.map((m) => <MessageItem key={m.id} m={m} />)}
          </div>

          <div className={styles.quickPrompts}>
            <div className={styles.quickPromptsHeader}>Gợi ý nhanh</div>
            {quickPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => setInput(prompt)}
              >
                <span>{prompt}</span>
                <span className={styles.quickPromptArrow}>↗</span>
              </button>
            ))}
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
