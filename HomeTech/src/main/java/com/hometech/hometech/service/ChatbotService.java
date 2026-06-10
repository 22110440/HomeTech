package com.hometech.hometech.service;

import com.hometech.hometech.Repository.ChatMessageRepository;
import com.hometech.hometech.Repository.ChatbotRuleRepository;
import com.hometech.hometech.Repository.ChatbotSettingRepository;
import com.hometech.hometech.dto.ChatMessagePayload;
import com.hometech.hometech.enums.SenderType;
import com.hometech.hometech.model.ChatMessage;
import com.hometech.hometech.model.ChatbotRule;
import com.hometech.hometech.model.ChatbotSetting;
import jakarta.annotation.PostConstruct;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;

@Service
public class ChatbotService {

    private final ChatbotSettingRepository chatbotSettingRepository;
    private final ChatbotRuleRepository chatbotRuleRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final ConversationService conversationService;
    private final GeminiService geminiService;
    private final ChatbotBusinessAssistantService businessAssistantService;
    private final SimpMessagingTemplate messagingTemplate;

    public ChatbotService(ChatbotSettingRepository chatbotSettingRepository,
                          ChatbotRuleRepository chatbotRuleRepository,
                          ChatMessageRepository chatMessageRepository,
                          ConversationService conversationService,
                          GeminiService geminiService,
                          ChatbotBusinessAssistantService businessAssistantService,
                          SimpMessagingTemplate messagingTemplate) {
        this.chatbotSettingRepository = chatbotSettingRepository;
        this.chatbotRuleRepository = chatbotRuleRepository;
        this.chatMessageRepository = chatMessageRepository;
        this.conversationService = conversationService;
        this.geminiService = geminiService;
        this.businessAssistantService = businessAssistantService;
        this.messagingTemplate = messagingTemplate;
    }

    @PostConstruct
    public void init() {
        if (chatbotSettingRepository.count() == 0) {
            ChatbotSetting setting = new ChatbotSetting();
            setting.setMode("RULES");
            chatbotSettingRepository.save(setting);
        }
    }

    public ChatbotSetting getSettings() {
        return chatbotSettingRepository.findAll().stream().findFirst()
                .orElseGet(() -> {
                    ChatbotSetting setting = new ChatbotSetting();
                    setting.setMode("RULES");
                    return chatbotSettingRepository.save(setting);
                });
    }

    @Transactional
    public ChatbotSetting updateSettings(ChatbotSetting newSettings) {
        ChatbotSetting current = getSettings();
        current.setMode(newSettings.getMode());
        current.setGeminiApiKey(newSettings.getGeminiApiKey());
        current.setAiSystemInstruction(newSettings.getAiSystemInstruction());
        current.setGeminiModel(newSettings.getGeminiModel());
        return chatbotSettingRepository.save(current);
    }

    public List<ChatbotRule> getAllRules() {
        return chatbotRuleRepository.findAll();
    }

    @Transactional
    public ChatbotRule createRule(ChatbotRule rule) {
        rule.setId(null);
        return chatbotRuleRepository.save(rule);
    }

    @Transactional
    public ChatbotRule updateRule(Long id, ChatbotRule newRule) {
        ChatbotRule existing = chatbotRuleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy quy tắc chatbot"));
        existing.setKeyword(newRule.getKeyword());
        existing.setResponse(newRule.getResponse());
        existing.setActive(newRule.isActive());
        existing.setFallback(newRule.isFallback());
        return chatbotRuleRepository.save(existing);
    }

    @Transactional
    public void deleteRule(Long id) {
        chatbotRuleRepository.deleteById(id);
    }

    /**
     * Trigger auto-reply asynchronously so it doesn't block the HTTP request thread.
     */
    public void triggerAutoReply(Long conversationId, String content) {
        if (content == null || content.trim().isEmpty()) {
            return;
        }

        CompletableFuture.runAsync(() -> {
            try {
                // Wait 1 second before responding to make the experience feel natural ("typing indicator")
                Thread.sleep(1000);
                
                // Check if admin has participated within threshold (to override bot replies)
                if (conversationService.hasAdminParticipation(conversationId)) {
                    return;
                }
                
                ChatbotSetting settings = getSettings();
                String mode = settings.getMode();

                if ("DISABLED".equalsIgnoreCase(mode)) {
                    return;
                }

                String reply = null;
                String intent = null;
                boolean handoffRequested = false;
                String handoffReason = null;

                Optional<ChatbotBusinessAssistantService.AssistantReply> businessReply =
                        businessAssistantService.resolveReply(conversationId, content);
                if (businessReply.isPresent()) {
                    ChatbotBusinessAssistantService.AssistantReply assistantReply = businessReply.get();
                    reply = assistantReply.getContent();
                    intent = assistantReply.getIntent();
                    handoffRequested = assistantReply.isHandoffRequested();
                    handoffReason = assistantReply.getHandoffReason();
                }

                // 1. Process rules if mode is RULES or HYBRID
                if (reply == null && ("RULES".equalsIgnoreCase(mode) || "HYBRID".equalsIgnoreCase(mode))) {
                    reply = matchRules(content);
                    if (reply != null) {
                        intent = "RULE_MATCH";
                    }
                }

                // 2. Process AI if no rule matched and mode is AI or HYBRID
                if (reply == null && ("AI".equalsIgnoreCase(mode) || "HYBRID".equalsIgnoreCase(mode))) {
                    if (settings.getGeminiApiKey() != null && !settings.getGeminiApiKey().trim().isEmpty()) {
                        String history = getFormattedHistory(conversationId);
                        reply = geminiService.generateReply(content, history, settings);
                        intent = "AI_REPLY";
                    }
                }

                // 3. Fallback message if still no reply
                if (reply == null) {
                    Optional<ChatbotRule> fallbackRule = chatbotRuleRepository
                            .findFirstByIsActiveTrueAndIsFallbackTrueOrderByCreatedAtDesc();
                    if (fallbackRule.isPresent()) {
                        reply = fallbackRule.get().getResponse();
                        intent = "FALLBACK_RULE";
                    }
                }

                // Send the reply
                if (reply != null) {
                    sendAutoReply(conversationId, reply, intent, handoffRequested, handoffReason);
                }
            } catch (Exception e) {
                System.err.println("Error generating auto reply: " + e.getMessage());
            }
        });
    }

    private String matchRules(String text) {
        String lowerText = text.toLowerCase();
        List<ChatbotRule> activeRules = chatbotRuleRepository.findByIsActiveTrue();
        
        for (ChatbotRule rule : activeRules) {
            if (rule.isFallback() || rule.getKeyword() == null || rule.getKeyword().trim().isEmpty()) {
                continue;
            }
            
            // Keywords are comma separated
            String[] keywords = rule.getKeyword().split(",");
            for (String keyword : keywords) {
                String cleanKw = keyword.trim().toLowerCase();
                if (!cleanKw.isEmpty() && lowerText.contains(cleanKw)) {
                    return rule.getResponse();
                }
            }
        }
        return null;
    }

    private String getFormattedHistory(Long conversationId) {
        // Get last 10 messages
        List<ChatMessage> messages = chatMessageRepository.findTop10ByConversationIdOrderBySentAtDesc(conversationId);
        
        // Reverse to get chronological order
        Collections.reverse(messages);

        return messages.stream()
                .filter(m -> m.getContent() != null && !m.getContent().trim().isEmpty())
                .map(m -> {
                    String sender = m.getSenderType() == SenderType.CUSTOMER ? "Khách hàng" : "Hỗ trợ";
                    return "- " + sender + ": " + m.getContent().trim();
                })
                .collect(Collectors.joining("\n"));
    }

    @Transactional
    protected void sendAutoReply(Long conversationId,
                                 String replyContent,
                                 String intent,
                                 boolean handoffRequested,
                                 String handoffReason) {
        // Send via ConversationService as BOT (senderId = 0)
        ChatMessage saved = conversationService.sendMessage(conversationId, SenderType.BOT, 0L, replyContent, null);
        
        // Mark as auto reply
        saved.setAutoReply(true);
        saved.setChatbotIntent(intent);
        saved.setHandoffRequested(handoffRequested);
        saved = chatMessageRepository.save(saved);
        conversationService.updateBotState(conversationId, intent, handoffRequested, handoffReason);

        // Build WebSocket payload
        ChatMessagePayload payload = new ChatMessagePayload();
        payload.setId(saved.getId());
        payload.setSenderType(saved.getSenderType().name());
        payload.setSenderId(saved.getSenderId());
        payload.setContent(saved.getContent());
        payload.setSentAt(saved.getSentAt());
        payload.setHasFile(false);
        payload.setAutoReply(true);
        payload.setChatbotIntent(saved.getChatbotIntent());
        payload.setHandoffRequested(saved.isHandoffRequested());

        // Broadcast realtime
        messagingTemplate.convertAndSend(
                "/topic/conversations/" + conversationId,
                payload
        );
    }
}
