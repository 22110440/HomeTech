package com.hometech.hometech.controller.Api;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.hometech.hometech.dto.ChatMessagePayload;
import com.hometech.hometech.enums.SenderType;
import com.hometech.hometech.model.ChatMessage;
import com.hometech.hometech.service.ChatIdentityService;
import com.hometech.hometech.service.ConversationService;

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

                p.setHasFile(m.getFileData() != null);
                p.setFileName(m.getFileName());
                p.setFileContentType(m.getFileContentType());
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

    @PostMapping(
        value = "/messages",
        consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    public ResponseEntity<?> sendMessage(
            @RequestParam("conversationId") Long conversationId,
            @RequestParam(value = "content", required = false) String content,
            @RequestPart(value = "file", required = false) MultipartFile file,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        try {
            // 1. Resolve identity
            ChatIdentityService.ChatIdentity identity =
                    chatIdentityService.resolve(userDetails);

            SenderType senderType;
            Long senderId;

            if (identity.isCustomer()) {
                senderType = SenderType.CUSTOMER;
                senderId = identity.getCustomer().getId();
            } else if (identity.isAdmin()) {
                senderType = SenderType.ADMIN;
                senderId = identity.getAdmin().getId();
            } else {
                throw new RuntimeException("Không xác định được người gửi");
            }

            // 2. GỌI ĐÚNG METHOD TRONG ConversationService
            ChatMessage savedMessage = conversationService.sendMessage(
                    conversationId,
                    senderType,
                    senderId,
                    content,
                    file
            );

            // 3. Build payload realtime
            ChatMessagePayload payload = new ChatMessagePayload();
            payload.setId(savedMessage.getId());
            payload.setSenderType(savedMessage.getSenderType().name());
            payload.setSenderId(savedMessage.getSenderId());
            payload.setContent(savedMessage.getContent());
            payload.setSentAt(savedMessage.getSentAt());

            // 4. Gửi WebSocket
            messagingTemplate.convertAndSend(
                    "/topic/conversations/" + conversationId,
                    payload
            );

            return ResponseEntity.ok(payload);

        } catch (RuntimeException e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }
    }
    @GetMapping("/messages/{id}/file")
    public ResponseEntity<byte[]> downloadFile(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        // 1. Resolve identity
        ChatIdentityService.ChatIdentity identity =
                chatIdentityService.resolve(userDetails);

        // 2. Lấy message theo ID (ĐÚNG NGHIỆP VỤ)
        ChatMessage message = conversationService.getMessageById(id);

        // 3. Check quyền (customer chỉ xem message của mình)
        if (identity.isCustomer()) {
            Long customerId = message.getConversation().getCustomer().getId();
            if (!customerId.equals(identity.getCustomer().getId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
        }

        // 4. Không có file
        if (message.getFileData() == null) {
            return ResponseEntity.notFound().build();
        }

        // 5. Trả file từ LONGBLOB
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(message.getFileContentType()))
                .header(
                        HttpHeaders.CONTENT_DISPOSITION,
                        "inline; filename=\"" + message.getFileName() + "\""
                )
                .body(message.getFileData());
    }
}


