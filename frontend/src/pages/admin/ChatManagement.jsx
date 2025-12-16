import { useEffect, useRef, useState } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { chatAPI } from '../../services/api';
import styles from './ChatManagement.module.css';

function ChatManagement({ initialUserId }) {
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState('');

  const stompClientRef = useRef(null);
  const subscriptionRef = useRef(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, activeConversation]);

  useEffect(() => {
    const fetchConversations = async () => {
      setLoadingConversations(true);
      setError('');
      try {
        const data = await chatAPI.getAdminConversations();
        const list = Array.isArray(data) ? data : data?.data || [];
        const sorted = [...list].sort(
          (a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0),
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

  const connectWebSocket = (conversationId) => {
    if (!conversationId) return;

    if (!stompClientRef.current) {
      const client = new Client({
        webSocketFactory: () => new SockJS('/ws'),
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
      `/topic/messages/${conversationId}`,
      (message) => {
        try {
          const body = JSON.parse(message.body);
          setMessages((prev) => [...prev, body]);
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

  const loadMessages = async (conversation) => {
    if (!conversation?.id) return;
    setLoadingMessages(true);
    setError('');
    try {
      const data = await chatAPI.getConversationMessages(conversation.id);
      const list = Array.isArray(data) ? data : data?.data || [];
      setMessages(list);
      connectWebSocket(conversation.id);
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

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || !activeConversation?.id) return;
    try {
      await chatAPI.sendMessage(activeConversation.id, input.trim());
      setInput('');
    } catch (e) {
      console.error('Failed to send message', e);
      setError('Không thể gửi tin nhắn.');
    }
  };

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

  return (
    <div className={styles.container}>
      <div className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <h2>Chat khách hàng</h2>
          <p>Chọn cuộc trò chuyện để hỗ trợ</p>
        </div>
        <div className={styles.sidebarBody}>
          {loadingConversations && <div className={styles.placeholder}>Đang tải...</div>}
          {!loadingConversations && conversations.length === 0 && (
            <div className={styles.placeholder}>Chưa có cuộc trò chuyện nào.</div>
          )}
          {!loadingConversations &&
            conversations.map((c) => {
              const isActive = activeConversation?.id === c.id;
              const displayName = `${c.userId ?? 'N/A'} - ${c.username ?? 'Khách hàng'}`;
              return (
                <button
                  key={c.id}
                  type="button"
                  className={`${styles.conversationItem} ${
                    isActive ? styles.conversationItemActive : ''
                  }`}
                  onClick={() => handleSelectConversation(c)}
                >
                  <div className={styles.conversationName}>{displayName}</div>
                  <div className={styles.conversationMeta}>
                    <span>{formatTime(c.lastMessageAt)}</span>
                  </div>
                </button>
              );
            })}
        </div>
      </div>

      <div className={styles.chatPanel}>
        {activeConversation ? (
          <>
            <div className={styles.chatHeader}>
              <div>
                <h3>
                  {activeConversation.userId ?? 'N/A'} -{' '}
                  {activeConversation.username ?? 'Khách hàng'}
                </h3>
                <p>Trao đổi trực tiếp với khách hàng theo thời gian thực</p>
              </div>
            </div>

            <div className={styles.messages}>
              {loadingMessages && <div className={styles.systemMessage}>Đang tải tin nhắn...</div>}
              {!loadingMessages &&
                messages.map((m) => (
                  <div
                    key={m.id}
                    className={
                      m.senderType === 'ADMIN' ? styles.messageAdmin : styles.messageCustomer
                    }
                  >
                    <div className={styles.bubble}>
                      <div className={styles.content}>{m.content}</div>
                      <div className={styles.timestamp}>{formatTime(m.sentAt)}</div>
                    </div>
                  </div>
                ))}
              <div ref={messagesEndRef} />
            </div>

            <form className={styles.inputArea} onSubmit={handleSend}>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Nhập tin nhắn để trả lời khách hàng..."
              />
              <button type="submit">Gửi</button>
            </form>
          </>
        ) : (
          <div className={styles.emptyState}>
            <h3>Chọn một cuộc trò chuyện</h3>
            <p>Chọn khách hàng ở bên trái để bắt đầu chat.</p>
          </div>
        )}

        {error && <div className={styles.error}>{error}</div>}
      </div>
    </div>
  );
}

export default ChatManagement;


