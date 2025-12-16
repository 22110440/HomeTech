package com.hometech.hometech.service;

import com.hometech.hometech.Repository.AdminRepository;
import com.hometech.hometech.Repository.NotifyRepository;
import com.hometech.hometech.Repository.UserRepository;
import com.hometech.hometech.enums.RoleType;
import com.hometech.hometech.model.Admin;
import com.hometech.hometech.model.Notify;
import com.hometech.hometech.model.User;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class NotifyService {

    private final NotifyRepository notifyRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final AdminRepository adminRepository;

    public NotifyService(NotifyRepository notifyRepository,
                        UserRepository userRepository,
                        SimpMessagingTemplate messagingTemplate,
                        AdminRepository adminRepository) {
        this.notifyRepository = notifyRepository;
        this.userRepository = userRepository;
        this.messagingTemplate = messagingTemplate;
        this.adminRepository = adminRepository;
    }

    /**
     * Create and send a notification to a specific user
     */
    @Transactional
    public Notify createNotification(Long userId, String message, String type, Long relatedId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));

        Notify notification = new Notify();
        notification.setUser(user);
        notification.setMessage(message);
        notification.setType(type);
        notification.setRelatedId(relatedId);
        notification.setRead(false);
        notification.setCreatedAt(LocalDateTime.now());

        // Save to database
        Notify saved = notifyRepository.save(notification);

        // Send real-time notification via WebSocket
        sendRealtimeNotification(userId, saved);

        return saved;
    }

    /**
     * Broadcast a notification to all admins
     */
    public void notifyAdmins(String message, String type, Long relatedId) {
        try {
            List<Admin> admins = adminRepository.findAll();
            if (admins.isEmpty()) return;

            admins.forEach(admin -> {
                try {
                    createNotification(admin.getId(), message, type, relatedId);
                } catch (Exception ex) {
                    System.err.println("❌ Failed to notify admin #" + admin.getId() + ": " + ex.getMessage());
                }
            });
        } catch (Exception e) {
            System.err.println("❌ Failed to broadcast admin notification: " + e.getMessage());
        }
    }

    /**
     * Broadcast marketing/announcement notification to all active customers
     *
     * @return number of users received the notification
     */
    @Transactional
    public long broadcastToCustomers(String message, String type, Long relatedId) {
        List<User> users = userRepository.findAll();
        long sentCount = 0;

        for (User user : users) {
            if (user == null || user.getAccount() == null) continue;
            boolean isCustomer = RoleType.USER.equals(user.getAccount().getRole());
            boolean isEnabled = user.getAccount().isEnabled();
            if (!isCustomer || !isEnabled) continue;

            try {
                createNotification(user.getId(), message, type, relatedId);
                sentCount++;
            } catch (Exception ex) {
                System.err.println("❌ Failed to notify user #" + user.getId() + ": " + ex.getMessage());
            }
        }

        return sentCount;
    }

    /**
     * Send real-time notification to specific user via WebSocket
     */
    private void sendRealtimeNotification(Long userId, Notify notification) {
        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("id", notification.getId());
            payload.put("message", notification.getMessage());
            payload.put("type", notification.getType());
            payload.put("relatedId", notification.getRelatedId());
            payload.put("createdAt", notification.getCreatedAt().toString());
            payload.put("isRead", notification.isRead());

            // Send to specific user's topic
            messagingTemplate.convertAndSend("/topic/notifications/" + userId, payload);

            // Also send to general topic for backward compatibility
            messagingTemplate.convertAndSend("/topic/notifications", payload);

            System.out.println("🔔 Notification sent to user " + userId + ": " + notification.getMessage());
        } catch (Exception e) {
            System.err.println("❌ Failed to send real-time notification: " + e.getMessage());
        }
    }

    /**
     * Get all notifications for a user
     */
    public List<Notify> getUserNotifications(Long userId) {
        return notifyRepository.findByUser_IdOrderByCreatedAtDesc(userId);
    }

    /**
     * Get unread notifications for a user
     */
    public List<Notify> getUnreadNotifications(Long userId) {
        return notifyRepository.findByUser_IdAndIsReadFalseOrderByCreatedAtDesc(userId);
    }

    /**
     * Get unread notification count
     */
    public long getUnreadCount(Long userId) {
        return notifyRepository.countByUser_IdAndIsReadFalse(userId);
    }

    /**
     * Mark a notification as read
     */
    @Transactional
    public void markAsRead(Long notificationId) {
        Notify notification = notifyRepository.findById(notificationId)
                .orElseThrow(() -> new RuntimeException("Notification not found"));
        notification.setRead(true);
        notifyRepository.save(notification);
    }

    /**
     * Mark all notifications as read for a user
     */
    @Transactional
    public void markAllAsRead(Long userId) {
        notifyRepository.markAllAsReadByUserId(userId);
    }

    /**
     * Delete a notification
     */
    @Transactional
    public void deleteNotification(Long notificationId) {
        notifyRepository.deleteById(notificationId);
    }

    /**
     * Delete old read notifications (older than 30 days)
     */
    @Transactional
    public void cleanupOldNotifications() {
        LocalDateTime cutoffDate = LocalDateTime.now().minusDays(30);
        notifyRepository.deleteOldReadNotifications(cutoffDate);
    }
}



