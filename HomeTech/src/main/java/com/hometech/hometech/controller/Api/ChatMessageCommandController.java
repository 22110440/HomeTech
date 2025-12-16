package com.hometech.hometech.controller.Api;

import com.hometech.hometech.dto.ChatMessagePayload;
import com.hometech.hometech.dto.SendChatMessageRequest;
import com.hometech.hometech.model.ChatMessage;
import com.hometech.hometech.service.ChatIdentityService;
import com.hometech.hometech.service.ConversationService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/chat")
public class ChatMessageCommandController {

    private final ChatIdentityService chatIdentityService;
    private final ConversationService conversationService;
    private final SimpMessagingTemplate messagingTemplate;

    public ChatMessageCommandController(ChatIdentityService chatIdentityService,
                                        ConversationService conversationService,
                                        SimpMessagingTemplate messagingTemplate) {
        this.chatIdentityService = chatIdentityService;
        this.conversationService = conversationService;
        this.messagingTemplate = messagingTemplate;
    }

    @GetMapping("/conversations/me")
    public ResponseEntity<?> getMyConversation(@AuthenticationPrincipal UserDetails userDetails) {
        try {
            ChatIdentityService.ChatIdentity identity = chatIdentityService.resolve(userDetails);
            if (!identity.isCustomer()) {
                throw new RuntimeException("Chỉ khách hàng mới có thể xem cuộc trò chuyện của chính mình");
            }
            var conversation = conversationService.getOrCreateConversation(identity.getCustomer());

            Map<String, Object> dto = new HashMap<>();
            dto.put("id", conversation.getId());

            return ResponseEntity.ok(dto);
        } catch (RuntimeException e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }
    }

    @GetMapping("/conversations/admin")
    public ResponseEntity<?> getAllConversations(@AuthenticationPrincipal UserDetails userDetails) {
        try {
            ChatIdentityService.ChatIdentity identity = chatIdentityService.resolve(userDetails);
            if (!identity.isAdmin()) {
                throw new RuntimeException("Chỉ admin mới có thể xem danh sách cuộc trò chuyện");
            }

            List<Map<String, Object>> items = conversationService.getAllConversations()
                    .stream()
                    .map(c -> {
                        Map<String, Object> dto = new HashMap<>();
                        dto.put("id", c.getId());
                        if (c.getCustomer() != null) {
                            dto.put("userId", c.getCustomer().getId());
                            dto.put("username", c.getCustomer().getFullName());
                        } else {
                            dto.put("userId", null);
                            dto.put("username", "Khách hàng");
                        }
                        dto.put("lastMessageAt", c.getLastMessageAt());
                        return dto;
                    })
                    .collect(Collectors.toList());

            return ResponseEntity.ok(items);
        } catch (RuntimeException e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }
    }

    @GetMapping("/conversations/{id}/messages")
    public ResponseEntity<?> getMessages(@PathVariable Long id,
                                         @AuthenticationPrincipal UserDetails userDetails) {
        try {
            ChatIdentityService.ChatIdentity identity = chatIdentityService.resolve(userDetails);
            // Nếu là customer, check quyền trên conversation
            if (identity.isCustomer()) {
                conversationService.getConversationForCustomer(id, identity.getCustomer().getId());
            }
            List<ChatMessage> messages = conversationService.getMessages(id);

            List<ChatMessagePayload> payloads = messages.stream().map(m -> {
                ChatMessagePayload p = new ChatMessagePayload();
                p.setId(m.getId());
                p.setSenderType(m.getSenderType().name());
                p.setSenderId(m.getSenderId());
                p.setContent(m.getContent());
                p.setSentAt(m.getSentAt());
                return p;
            }).collect(Collectors.toList());

            return ResponseEntity.ok(payloads);
        } catch (RuntimeException e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }
    }

    @GetMapping("/unread-count")
    public ResponseEntity<?> getUnreadCount(@AuthenticationPrincipal UserDetails userDetails) {
        try {
            ChatIdentityService.ChatIdentity identity = chatIdentityService.resolve(userDetails);
            if (!identity.isCustomer()) {
                throw new RuntimeException("Chỉ khách hàng mới có thể xem số tin nhắn chưa đọc");
            }
            long count = conversationService.getUnreadCountForCustomer(identity.getCustomer());
            return ResponseEntity.ok(Map.of("count", count));
        } catch (RuntimeException e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }
    }

    @PostMapping("/mark-read")
    public ResponseEntity<?> markAsRead(@AuthenticationPrincipal UserDetails userDetails) {
        try {
            ChatIdentityService.ChatIdentity identity = chatIdentityService.resolve(userDetails);
            if (!identity.isCustomer()) {
                throw new RuntimeException("Chỉ khách hàng mới có thể đánh dấu đã đọc");
            }
            conversationService.markMessagesAsReadForCustomer(identity.getCustomer());
            return ResponseEntity.ok(Map.of("success", true));
        } catch (RuntimeException e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }
    }

    @GetMapping("/admin/customer/{userId}/conversation")
    public ResponseEntity<?> getOrCreateConversationForCustomer(@PathVariable Long userId,
                                                                @AuthenticationPrincipal UserDetails userDetails) {
        try {
            ChatIdentityService.ChatIdentity identity = chatIdentityService.resolve(userDetails);
            if (!identity.isAdmin()) {
                throw new RuntimeException("Chỉ admin mới có thể tạo cuộc trò chuyện với khách hàng");
            }

            var conversation = conversationService.getOrCreateConversationByCustomerId(userId);

            Map<String, Object> dto = new HashMap<>();
            dto.put("id", conversation.getId());
            if (conversation.getCustomer() != null) {
                dto.put("userId", conversation.getCustomer().getId());
                dto.put("username", conversation.getCustomer().getFullName());
            } else {
                dto.put("userId", null);
                dto.put("username", "Khách hàng");
            }
            dto.put("lastMessageAt", conversation.getLastMessageAt());

            return ResponseEntity.ok(dto);
        } catch (RuntimeException e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }
    }

    @PostMapping("/messages")
    public ResponseEntity<Map<String, Object>> sendMessage(
            @RequestBody SendChatMessageRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {

        Map<String, Object> response = new HashMap<>();

        try {
            ChatIdentityService.ChatIdentity identity = chatIdentityService.resolve(userDetails);

            if (request.getContent() == null || request.getContent().trim().isEmpty()) {
                throw new RuntimeException("Nội dung tin nhắn không được để trống");
            }

            Long conversationId = request.getConversationId();
            if (identity.isCustomer()) {
                if (conversationId == null) {
                    conversationId = conversationService
                            .getOrCreateConversation(identity.getCustomer())
                            .getId();
                } else {
                    conversationService.getConversationForCustomer(conversationId,
                            identity.getCustomer().getId());
                }
            } else if (conversationId == null) {
                throw new RuntimeException("Admin phải chọn cuộc trò chuyện");
            }

            ChatMessage message = conversationService.sendMessage(
                    conversationId,
                    identity.getSenderType(),
                    identity.getSenderId(),
                    request.getContent()
            );

            messagingTemplate.convertAndSend("/topic/messages/" + conversationId, message);

            response.put("success", true);
            response.put("message", "Message sent");
            response.put("data", message);
            return ResponseEntity.ok(response);

        } catch (RuntimeException e) {
            response.put("success", false);
            response.put("message", "Failed to send message");
            response.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }
    }
}


