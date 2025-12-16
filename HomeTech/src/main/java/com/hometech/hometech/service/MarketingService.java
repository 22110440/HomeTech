package com.hometech.hometech.service;

import com.hometech.hometech.Repository.UserRepository;
import com.hometech.hometech.enums.RoleType;
import com.hometech.hometech.model.User;
import jakarta.mail.MessagingException;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class MarketingService {

    private final UserRepository userRepository;
    private final EmailService emailService;

    public MarketingService(UserRepository userRepository, EmailService emailService) {
        this.userRepository = userRepository;
        this.emailService = emailService;
    }

    public BroadcastResult broadcastEmailToCustomers(String subject, String htmlContent) {
        List<User> users = userRepository.findAll();
        long eligible = 0;
        long sent = 0;
        List<String> failed = new ArrayList<>();

        for (User user : users) {
            if (user == null || user.getAccount() == null) continue;
            if (!RoleType.USER.equals(user.getAccount().getRole())) continue;
            if (!user.getAccount().isEnabled()) continue;

            String email = user.getAccount().getEmail();
            if (email == null || email.isBlank()) continue;

            eligible++;
            try {
                emailService.sendMarketingEmail(email, subject, htmlContent);
                sent++;
            } catch (MessagingException ex) {
                failed.add(email);
                System.err.println("❌ Failed to send marketing email to " + email + ": " + ex.getMessage());
            }
        }

        return new BroadcastResult(eligible, sent, failed);
    }

    public record BroadcastResult(long eligible, long sent, List<String> failedRecipients) {
        public long failedCount() {
            return failedRecipients != null ? failedRecipients.size() : 0;
        }
    }
}

