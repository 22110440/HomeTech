package com.hometech.hometech.controller.Api;

import com.hometech.hometech.Repository.AccountRepository;
import com.hometech.hometech.enums.RoleType;
import com.hometech.hometech.model.Account;
import com.hometech.hometech.service.MarketingService;
import lombok.Data;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/marketing")
public class MarketingController {

    private final MarketingService marketingService;
    private final AccountRepository accountRepository;

    public MarketingController(MarketingService marketingService, AccountRepository accountRepository) {
        this.marketingService = marketingService;
        this.accountRepository = accountRepository;
    }

    
    public static class MarketingEmailRequest {
        private String subject;
        private String content;
        public String getSubject() {
            return subject;
        }
        public void setSubject(String subject) {
            this.subject = subject;
        }
        public String getContent() {
            return content;
        }
        public void setContent(String content) {
            this.content = content;
        }
    }

    private Account resolveAccount(Authentication authentication) {
        if (authentication != null && authentication.isAuthenticated()) {
            String name = authentication.getName();
            Account account = accountRepository.findByUsername(name)
                    .or(() -> accountRepository.findByEmail(name))
                    .orElse(null);
            if (account == null && authentication instanceof OAuth2AuthenticationToken oAuth) {
                Object principal = oAuth.getPrincipal();
                if (principal instanceof OAuth2User oAuthUser) {
                    Object emailAttr = oAuthUser.getAttributes().get("email");
                    if (emailAttr != null) {
                        account = accountRepository.findByEmail(String.valueOf(emailAttr)).orElse(null);
                    }
                }
            }
            return account;
        }
        return null;
    }

    private boolean isCurrentUserAdmin() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        Account account = resolveAccount(authentication);
        return account != null && RoleType.ADMIN.equals(account.getRole());
    }

    @PostMapping("/email")
    public ResponseEntity<Map<String, Object>> sendMarketingEmail(@RequestBody MarketingEmailRequest request) {
        if (!isCurrentUserAdmin()) {
            return ResponseEntity.status(403).body(Map.of(
                    "success", false,
                    "message", "Bạn không có quyền thực hiện hành động này"
            ));
        }

        if (request == null || !StringUtils.hasText(request.getSubject()) || !StringUtils.hasText(request.getContent())) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Tiêu đề và nội dung email không được để trống"
            ));
        }

        MarketingService.BroadcastResult result = marketingService.broadcastEmailToCustomers(
                request.getSubject().trim(),
                request.getContent().trim()
        );

        return ResponseEntity.ok(Map.of(
                "success", true,
                "eligible", result.eligible(),
                "sent", result.sent(),
                "failed", result.failedCount()
        ));
    }
}

