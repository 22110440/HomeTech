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
import org.springframework.web.multipart.MultipartFile;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.io.IOException;
import java.nio.file.Files;

import java.time.LocalDateTime;
import java.time.Duration;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class ConversationService {

    private static final Duration ADMIN_OVERRIDE_WINDOW = Duration.ofMinutes(30);

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
    public Conversation getConversationById(Long conversationId) {
        return conversationRepository.findById(conversationId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy cuộc trò chuyện"));
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
    public ChatMessage sendMessage(
            Long conversationId,
            SenderType senderType,
            Long senderId,
            String content,
            MultipartFile file
    ) {
        ChatMessage message = new ChatMessage();

        message.setSenderType(senderType);
        message.setSenderId(senderId);
        message.setContent(content);
        // sentAt & read sẽ set trong @PrePersist

        // 🔥 FIX QUAN TRỌNG NHẤT
        Conversation conversation = conversationRepository
                .findById(conversationId)
                .orElseThrow(() -> new RuntimeException("Conversation not found"));

        message.setConversation(conversation);

        if (file != null && !file.isEmpty()) {
            try {
                String storedName = UUID.randomUUID() + "_" + file.getOriginalFilename();

                Path uploadDir = Paths.get("uploads/chat");
                Files.createDirectories(uploadDir);

                Path filePath = uploadDir.resolve(storedName);
                Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

                message.setFileData(file.getBytes());
                message.setFileName(file.getOriginalFilename());
                message.setFileContentType(file.getContentType());

            } catch (IOException e) {
                throw new RuntimeException("Lỗi khi lưu file chat", e);
            }
        }

        // Cập nhật lastMessageAt cho conversation
        conversation.setLastMessageAt(LocalDateTime.now());
        if (senderType == SenderType.ADMIN) {
            conversation.setHandoffRequested(false);
            conversation.setHandoffReason(null);
            conversation.setHandoffRequestedAt(null);
        }
        conversationRepository.save(conversation);

        return chatMessageRepository.save(message);
    }

    @Transactional(readOnly = true)
    public List<Conversation> getAllConversations() {
        return conversationRepository.findAllByOrderByLastMessageAtDesc();
    }

    @Transactional
    public long getUnreadCountForCustomer(Customer customer) {
        Conversation c = getOrCreateConversation(customer);
        long adminUnread = chatMessageRepository.countByConversationAndSenderTypeAndReadIsFalse(c, SenderType.ADMIN);
        long botUnread = chatMessageRepository.countByConversationAndSenderTypeAndReadIsFalse(c, SenderType.BOT);
        return adminUnread + botUnread;
    }

    @Transactional
    public void markMessagesAsReadForCustomer(Customer customer) {
        Conversation c = getOrCreateConversation(customer);
        chatMessageRepository.markAsReadForConversationAndSenderType(c, SenderType.ADMIN);
        chatMessageRepository.markAsReadForConversationAndSenderType(c, SenderType.BOT);
    }

    @Transactional(readOnly = true)
    public boolean hasAdminParticipation(Long conversationId) {
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy cuộc trò chuyện"));
        LocalDateTime threshold = LocalDateTime.now().minus(ADMIN_OVERRIDE_WINDOW);
        return chatMessageRepository
                .findTopByConversationAndSenderTypeOrderBySentAtDesc(conversation, SenderType.ADMIN)
                .map(ChatMessage::getSentAt)
                .map(sentAt -> sentAt != null && !sentAt.isBefore(threshold))
                .orElse(false);
    }

    @Transactional(readOnly = true)
    public long getUnreadCountForAdmin(Long conversationId) {
        return chatMessageRepository.countByConversationIdAndSenderTypeAndReadIsFalse(
                conversationId, SenderType.CUSTOMER);
    }

    @Transactional
    public void markMessagesAsReadForAdmin(Long conversationId) {
        chatMessageRepository.markAsReadByConversationIdAndSenderType(
                conversationId, SenderType.CUSTOMER);
    }

    @Transactional
    public void updateBotState(Long conversationId, String intent, boolean handoffRequested, String handoffReason) {
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy cuộc trò chuyện"));
        conversation.setLastBotIntent(intent);
        if (handoffRequested) {
            conversation.setHandoffRequested(true);
            conversation.setHandoffReason(handoffReason);
            conversation.setHandoffRequestedAt(LocalDateTime.now());
        }
        conversationRepository.save(conversation);
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
    public ChatMessage getMessageById(Long messageId) {
    return chatMessageRepository.findById(messageId)
            .orElseThrow(() -> new RuntimeException("Không tìm thấy tin nhắn"));
}

}

