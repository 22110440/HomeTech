package com.hometech.hometech.controller.Api;

import com.hometech.hometech.Repository.AccountRepository;
import com.hometech.hometech.Repository.UserRepository;
import com.hometech.hometech.enums.RoleType;
import com.hometech.hometech.model.Account;
import com.hometech.hometech.model.Notify;
import com.hometech.hometech.model.User;
import com.hometech.hometech.service.NotifyService;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
public class NotificationController {

    private final SimpMessagingTemplate messagingTemplate;
    private final NotifyService notifyService;
    private final AccountRepository accountRepository;
    private final UserRepository userRepository;

    public NotificationController(SimpMessagingTemplate messagingTemplate,
                                 NotifyService notifyService,
                                 AccountRepository accountRepository,
                                 UserRepository userRepository) {
        this.messagingTemplate = messagingTemplate;
        this.notifyService = notifyService;
        this.accountRepository = accountRepository;
        this.userRepository = userRepository;
    }

    @Data

    public static class Notification {
        public String getMessage() {
            return message;
        }

        public void setMessage(String message) {
            this.message = message;
        }

        public String getTimestamp() {
            return timestamp;
        }

        public void setTimestamp(String timestamp) {
            this.timestamp = timestamp;
        }

        private String message;
        private String timestamp;
        public Notification(String message, String timestamp) {
            this.message = message;
            this.timestamp = timestamp;
        }
        public Notification() {;}
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BroadcastRequest {
        private String message;
        private String type;
        private Long relatedId;
    }

    private Account resolveAccount(Authentication authentication) {
        System.out.println("🔍 getCurrentAccount - Authentication: " + (authentication != null ? authentication.getName() : "null"));
        if (authentication != null && authentication.isAuthenticated()) {
            String name = authentication.getName();
            Account account = accountRepository.findByUsername(name)
                    .or(() -> accountRepository.findByEmail(name))
                    .orElse(null);
            if (account == null && authentication instanceof OAuth2AuthenticationToken oAuth) {
                Object principal = oAuth.getPrincipal();
                if (principal instanceof OAuth2User) {
                    Object emailAttr = ((OAuth2User) principal).getAttributes().get("email");
                    System.out.println("🔍 OAuth2 email: " + emailAttr);
                    if (emailAttr != null) {
                        account = accountRepository.findByEmail(String.valueOf(emailAttr)).orElse(null);
                    }
                }
            }
            if (account == null) {
                System.out.println("⚠️ Account not found for: " + name);
            }
            return account;
        }
        System.out.println("⚠️ User not authenticated");
        return null;
    }

    private Account getCurrentAccount() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return resolveAccount(authentication);
    }

    private Long getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        Account account = resolveAccount(authentication);
        if (account == null) {
            return null;
        }
        User user = userRepository.findByAccount(account);
        Long userId = user != null ? user.getId() : null;
        System.out.println("✅ Current user ID: " + userId);
        return userId;
    }

    private boolean isCurrentUserAdmin() {
        Account account = getCurrentAccount();
        return account != null && RoleType.ADMIN.equals(account.getRole());
    }

    // STOMP entrypoint for app messages
    @MessageMapping("/notify")
    @SendTo("/topic/notifications")
    public Notification broadcast(Notification notification) {
        if (notification != null) {
            notification.setTimestamp(LocalDateTime.now().toString());
        }
        return notification;
    }

    // REST helper to trigger a test notification
    @PostMapping("/api/notify")
    public void sendNotification(@RequestBody Notification notification) {
        if (notification == null) {
            notification = new Notification("(trống)", LocalDateTime.now().toString());
        }
        notification.setTimestamp(LocalDateTime.now().toString());
        System.out.println("🔔 Sending test notification: " + notification.getMessage());
        messagingTemplate.convertAndSend("/topic/notifications", notification);
    }

    @PostMapping("/api/admin/notifications/broadcast")
    public ResponseEntity<Map<String, Object>> broadcastMarketing(@RequestBody BroadcastRequest request) {
        if (!isCurrentUserAdmin()) {
            return ResponseEntity.status(403).body(Map.of(
                    "success", false,
                    "message", "Bạn không có quyền gửi thông báo này"
            ));
        }

        if (request == null || !StringUtils.hasText(request.getMessage())) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Nội dung thông báo không được để trống"
            ));
        }

        String type = StringUtils.hasText(request.getType()) ? request.getType().trim() : "MARKETING";
        long sent = notifyService.broadcastToCustomers(request.getMessage().trim(), type, request.getRelatedId());

        return ResponseEntity.ok(Map.of(
                "success", true,
                "sent", sent
        ));
    }

    // GET endpoint for easy testing
    @GetMapping("/api/notify/test")
    public String sendTestNotification() {
        Long userId = getCurrentUserId();
        if (userId != null) {
            // Save to database
            notifyService.createNotification(userId, "Đây là thông báo thử nghiệm!", "TEST", null);
            return "Notification saved and sent!";
        } else {
            // Just send via WebSocket without saving
            Notification notification = new Notification("Đây là thông báo thử nghiệm!", LocalDateTime.now().toString());
            messagingTemplate.convertAndSend("/topic/notifications", notification);
            return "Notification sent (not saved - user not logged in)!";
        }
    }

    /**
     * Manually trigger notification for order status change
     * Use this when you manually update order status in database
     *
     * Example: POST /api/notify/order-status-manual
     * Body: {"orderId": 22, "userId": 4, "status": "CONFIRMED"}
     */
    @PostMapping("/api/notify/order-status-manual")
    public ResponseEntity<String> notifyOrderStatusManual(@RequestBody Map<String, Object> payload) {
        try {
            Long orderId = Long.parseLong(payload.get("orderId").toString());
            Long userId = Long.parseLong(payload.get("userId").toString());
            String status = payload.get("status").toString();

            String statusMessage = getStatusMessage(status);
            String message = String.format("Đơn hàng #%d %s", orderId, statusMessage);

            notifyService.createNotification(userId, message, "ORDER_STATUS", orderId);

            System.out.println("🔔 Manual notification sent for order #" + orderId + " to user #" + userId);
            return ResponseEntity.ok("Notification sent successfully!");
        } catch (Exception e) {
            System.err.println("❌ Failed to send manual notification: " + e.getMessage());
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }
//thanh toán, review, order xong backend ch test
//    thiếu chat, voucher, wishlish,
    private String getStatusMessage(String status) {
        switch (status.toUpperCase()) {
            case "WAITING_CONFIRMATION":
                return "đang chờ xác nhận";
            case "CONFIRMED":
                return "đã được xác nhận";
            case "SHIPPING":
                return "đang được giao";
            case "COMPLETED":
                return "đã giao thành công! 🎉";
            case "CANCELLED":
                return "đã bị hủy";
            default:
                return "đã thay đổi trạng thái thành " + status;
        }
    }

    /**
     * Get all notifications for current user
     */
    @GetMapping("/api/notifications")
    public ResponseEntity<List<Notify>> getUserNotifications() {
        System.out.println("📥 API: GET /api/notifications");
        Long userId = getCurrentUserId();
        if (userId == null) {
            System.out.println("❌ User not authenticated, returning 401");
            return ResponseEntity.status(401).build();
        }
        List<Notify> notifications = notifyService.getUserNotifications(userId);
        System.out.println("✅ Returning " + notifications.size() + " notifications for user " + userId);
        return ResponseEntity.ok(notifications);
    }

    /**
     * Get unread notifications count
     */
    @GetMapping("/api/notifications/unread/count")
    public ResponseEntity<Map<String, Long>> getUnreadCount() {
        System.out.println("📊 API: GET /api/notifications/unread/count");
        Long userId = getCurrentUserId();
        if (userId == null) {
            System.out.println("⚠️ User not authenticated, returning count=0");
            return ResponseEntity.ok(Map.of("count", 0L));
        }
        long count = notifyService.getUnreadCount(userId);
        System.out.println("✅ Unread count for user " + userId + ": " + count);
        return ResponseEntity.ok(Map.of("count", count));
    }

    /**
     * Get unread notifications
     */
    @GetMapping("/api/notifications/unread")
    public ResponseEntity<List<Notify>> getUnreadNotifications() {
        Long userId = getCurrentUserId();
        if (userId == null) {
            return ResponseEntity.status(401).build();
        }
        List<Notify> notifications = notifyService.getUnreadNotifications(userId);
        return ResponseEntity.ok(notifications);
    }

    /**
     * Mark notification as read
     */
    @PostMapping("/api/notifications/{id}/read")
    public ResponseEntity<Void> markAsRead(@PathVariable Long id) {
        Long userId = getCurrentUserId();
        if (userId == null) {
            return ResponseEntity.status(401).build();
        }
        try {
            notifyService.markAsRead(id);
            return ResponseEntity.ok().build();
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Mark all notifications as read
     */
    @PostMapping("/api/notifications/read-all")
    public ResponseEntity<Void> markAllAsRead() {
        Long userId = getCurrentUserId();
        if (userId == null) {
            return ResponseEntity.status(401).build();
        }
        notifyService.markAllAsRead(userId);
        return ResponseEntity.ok().build();
    }

    /**
     * Delete notification
     */
    @DeleteMapping("/api/notifications/{id}")
    public ResponseEntity<Void> deleteNotification(@PathVariable Long id) {
        Long userId = getCurrentUserId();
        if (userId == null) {
            return ResponseEntity.status(401).build();
        }
        try {
            notifyService.deleteNotification(id);
            return ResponseEntity.ok().build();
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }
}


