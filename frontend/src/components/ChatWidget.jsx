import { useEffect, useRef, useState } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import styles from './ChatWidget.module.css';

const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const stompClientRef = useRef(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const fetchWithAuth = async (url, options = {}) => {
    const token = localStorage.getItem('accessToken');
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
      throw new Error((await res.text()) || 'Request failed');
    }
    return res.json();
  };

  const loadConversationAndMessages = async () => {
    setLoading(true);
    try {
      const conv = await fetchWithAuth('/api/chat/conversations/me');
      setConversation(conv);
      const msgs = await fetchWithAuth(`/api/chat/conversations/${conv.id}/messages`);
      setMessages(msgs);
    } catch (e) {
      console.error('Failed to load chat conversation', e);
    } finally {
      setLoading(false);
    }
  };

  const loadUnreadCount = async () => {
    try {
      const res = await fetchWithAuth('/api/chat/unread-count');
      const count =
        typeof res?.count === 'number'
          ? res.count
          : typeof res?.data?.count === 'number'
          ? res.data.count
          : 0;
      setUnreadCount(count);
    } catch {
      // ignore
    }
  };

  const connectWebSocket = (conversationId) => {
    if (stompClientRef.current) {
      return;
    }
    const client = new Client({
      webSocketFactory: () => new SockJS('/ws'),
      reconnectDelay: 5000,
      debug: () => {},
    });

    client.onConnect = () => {
      client.subscribe(`/topic/messages/${conversationId}`, (message) => {
        try {
          const body = JSON.parse(message.body);
          setMessages((prev) => [...prev, body]);
        } catch (e) {
          console.error('Invalid message payload', e);
        }
      });
    };

    client.onStompError = (frame) => {
      console.error('STOMP error', frame);
    };

    client.activate();
    stompClientRef.current = client;
  };

  useEffect(() => {
    loadUnreadCount();
    const interval = setInterval(loadUnreadCount, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggleOpen = async () => {
    const newOpen = !isOpen;
    setIsOpen(newOpen);
    if (newOpen && !conversation) {
      await loadConversationAndMessages();
    }
    if (newOpen && conversation) {
      connectWebSocket(conversation.id);
    }
    if (newOpen) {
      try {
        await fetchWithAuth('/api/chat/mark-read', { method: 'POST' });
        setUnreadCount(0);
      } catch {
        // ignore
      }
    }
  };

  useEffect(() => {
    if (isOpen && conversation) {
      connectWebSocket(conversation.id);
    }
    return () => {
      if (stompClientRef.current) {
        stompClientRef.current.deactivate();
        stompClientRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, conversation?.id]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || !conversation) return;
    const payload = {
      conversationId: conversation.id,
      content: input.trim(),
    };
    try {
      await fetchWithAuth('/api/chat/messages', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setInput('');
      // message sẽ được thêm qua WebSocket subscribe
    } catch (e) {
      console.error('Failed to send message', e);
    }
  };

  return (
    <div className={styles.container}>
      {isOpen && (
        <div className={styles.chatWindow}>
          <div className={styles.header}>
            <span>Hỗ trợ khách hàng</span>
            <button className={styles.closeButton} onClick={handleToggleOpen}>
              ×
            </button>
          </div>
          <div className={styles.messages} id="chat-messages">
            {loading && <div className={styles.systemMessage}>Đang tải cuộc trò chuyện...</div>}
            {!loading &&
              messages.map((m) => (
                <div
                  key={m.id}
                  className={
                    m.senderType === 'CUSTOMER' ? styles.messageCustomer : styles.messageAdmin
                  }
                >
                  <div className={styles.bubble}>{m.content}</div>
                </div>
              ))}
            <div ref={messagesEndRef} />
          </div>
          <form className={styles.inputArea} onSubmit={handleSend}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Nhập tin nhắn..."
            />
            <button type="submit">Gửi</button>
          </form>
        </div>
      )}
      <button className={styles.fab} onClick={handleToggleOpen}>
        💬
        {unreadCount > 0 && (
          <span className={styles.badge}>{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>
    </div>
  );
};

export default ChatWidget;


