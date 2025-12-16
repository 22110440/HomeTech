package com.hometech.hometech.service;

import com.hometech.hometech.Repository.ChatMessageRepository;
import com.hometech.hometech.Repository.ConversationRepository;
import com.hometech.hometech.Repository.CustomerRepository;
import com.hometech.hometech.enums.SenderType;
import com.hometech.hometech.model.ChatMessage;
import com.hometech.hometech.model.Conversation;
import com.hometech.hometech.model.Customer;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class ConversationService {

    private final ConversationRepository conversationRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final CustomerRepository customerRepository;

    public ConversationService(ConversationRepository conversationRepository,
                               ChatMessageRepository chatMessageRepository,
                               CustomerRepository customerRepository) {
        this.conversationRepository = conversationRepository;
        this.chatMessageRepository = chatMessageRepository;
        this.customerRepository = customerRepository;
    }

    @Transactional
    public Conversation getOrCreateConversation(Customer customer) {
        return conversationRepository.findByCustomer(customer)
                .orElseGet(() -> {
                    Conversation c = new Conversation();
                    c.setCustomer(customer);
                    c.setCreatedAt(LocalDateTime.now());
                    c.setLastMessageAt(LocalDateTime.now());
                    return conversationRepository.save(c);
                });
    }

    @Transactional(readOnly = true)
    public Conversation getConversationForCustomer(Long id, Long customerId) {
        Conversation c = conversationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy cuộc trò chuyện"));
        if (!c.getCustomer().getId().equals(customerId)) {
            throw new RuntimeException("Không có quyền truy cập cuộc trò chuyện này");
        }
        return c;
    }

    @Transactional
    public ChatMessage sendMessage(Long conversationId,
                                   SenderType senderType,
                                   Long senderId,
                                   String content) {
        Conversation c = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy cuộc trò chuyện"));

        ChatMessage msg = new ChatMessage();
        msg.setConversation(c);
        msg.setSenderType(senderType);
        msg.setSenderId(senderId);
        msg.setContent(content.trim());

        ChatMessage saved = chatMessageRepository.save(msg);

        c.setLastMessageAt(saved.getSentAt());
        conversationRepository.save(c);

        return saved;
    }

    @Transactional(readOnly = true)
    public List<Conversation> getAllConversations() {
        return conversationRepository.findAll();
    }

    @Transactional(readOnly = true)
    public long getUnreadCountForCustomer(Customer customer) {
        Conversation c = getOrCreateConversation(customer);
        return chatMessageRepository.countByConversationAndSenderTypeAndReadIsFalse(
                c, SenderType.ADMIN);
    }

    @Transactional
    public void markMessagesAsReadForCustomer(Customer customer) {
        Conversation c = getOrCreateConversation(customer);
        chatMessageRepository.markAsReadForConversationAndSenderType(c, SenderType.ADMIN);
    }

    @Transactional
    public Conversation getOrCreateConversationByCustomerId(Long customerId) {
        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy khách hàng"));
        return getOrCreateConversation(customer);
    }

    @Transactional(readOnly = true)
    public List<ChatMessage> getMessages(Long conversationId) {
        Conversation c = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy cuộc trò chuyện"));
        return chatMessageRepository.findByConversationOrderBySentAtAsc(c);
    }
}


