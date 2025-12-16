package com.hometech.hometech.service;

import com.hometech.hometech.Repository.AccountRepository;
import com.hometech.hometech.Repository.UserRepository;
import com.hometech.hometech.enums.RoleType;
import com.hometech.hometech.model.Account;
import com.hometech.hometech.model.Customer;
import com.hometech.hometech.model.User;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.net.URL;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.Optional;
import java.util.UUID;

@Service
public class OAuth2UserService extends DefaultOAuth2UserService {

    private final UserRepository userRepository;
    private final AccountRepository accountRepository;

    public OAuth2UserService(UserRepository userRepository, AccountRepository accountRepository) {
        this.userRepository = userRepository;
        this.accountRepository = accountRepository;
    }

    @Override
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        return super.loadUser(userRequest);
    }

    /**
     * Xử lý khi người dùng đăng nhập bằng Google OAuth2
     */
    @Transactional
    public UserDetails processOAuth2User(OAuth2User oAuth2User) {
        String email = oAuth2User.getAttribute("email");
        String name = oAuth2User.getAttribute("name");
        String googleId = oAuth2User.getAttribute("sub"); // Google user ID
        String pictureUrl = oAuth2User.getAttribute("picture");

        if (email == null || email.isEmpty()) {
            throw new RuntimeException("❌ Google không trả về email, không thể đăng nhập.");
        }

        // 🔹 1. Tìm user theo Google ID
        User user = userRepository.findByGoogleId(googleId);
        if (user != null) {
            System.out.println("✅ Đăng nhập lại với Google ID: " + googleId);
            return createUserDetails(user.getAccount());
        }

        // 🔹 2. Tìm account theo email
        Optional<Account> accountOpt = accountRepository.findByEmail(email);
        Account account;

        if (accountOpt.isPresent()) {
            account = accountOpt.get();
            user = userRepository.findByAccount(account);

            if (user == null) {
                user = new Customer();
                user.setAccount(account);
            }
        } else {
            // 🔹 3. Tạo mới Account và User
            user = new Customer();
            user.setFullName(name);
            user.setGender("Không xác định");
            user.setGoogleId(googleId);
            user.setCreatedAt(LocalDateTime.now());
            user.setUpdatedAt(LocalDateTime.now());

            // ✅ Lưu user trước để sinh ID (vì Account có user_id)
            userRepository.saveAndFlush(user);

            account = new Account();
            account.setUsername(generateUniqueUsername(email.split("@")[0]));
            account.setEmail(email);
            account.setPassword(UUID.randomUUID().toString());
            account.setRole(RoleType.USER);
            account.setEnabled(true);
            account.setEmailVerified(true);
            account.setCreatedAt(LocalDateTime.now());
            account.setUpdatedAt(LocalDateTime.now());

            // ✅ Gán user đã có ID
            account.setUser(user);

            // ✅ Lưu account -> Hibernate ghi user_id vào DB
            accountRepository.saveAndFlush(account);

            // ✅ Gán ngược lại để đảm bảo quan hệ 2 chiều
            user.setAccount(account);
            userRepository.save(user);
        }

        // 🔹 4. Cập nhật thông tin từ Google
        user.setGoogleId(googleId);
        if (name != null) user.setFullName(name);
        user.setUpdatedAt(LocalDateTime.now());

        if (pictureUrl != null && !pictureUrl.isEmpty()) {
            try {
                byte[] imageBytes = new URL(pictureUrl).openStream().readAllBytes();
                user.setPictureBlob(imageBytes);
                user.setPictureContentType("image/jpeg");
            } catch (IOException e) {
                System.out.println("⚠️ Không thể tải ảnh từ Google: " + e.getMessage());
            }
        }

        userRepository.save(user);

        // 🔹 5. Đảm bảo account kích hoạt
        if (!account.isEnabled() || !account.isEmailVerified()) {
            account.setEnabled(true);
            account.setEmailVerified(true);
            account.setUpdatedAt(LocalDateTime.now());
            accountRepository.save(account);
        }

        // ✅ In ra để xác nhận
        System.out.println("✅ Google login thành công:");
        System.out.println("   - Account ID: " + account.getId());
        System.out.println("   - User ID: " + user.getId());
        System.out.println("   - Account.user_id: " + (account.getUser() != null ? account.getUser().getId() : "NULL"));

        return createUserDetails(account);
    }

    private String generateUniqueUsername(String baseUsername) {
        String username = baseUsername;
        int counter = 1;
        while (accountRepository.existsByUsername(username)) {
            username = baseUsername + counter;
            counter++;
        }
        return username;
    }

    private UserDetails createUserDetails(Account account) {
        return org.springframework.security.core.userdetails.User.builder()
                .username(account.getUsername())
                .password(account.getPassword() != null ? account.getPassword() : "")
                .authorities(Collections.singletonList(
                        new SimpleGrantedAuthority("ROLE_" + account.getRole())
                ))
                .accountExpired(false)
                .accountLocked(false)
                .credentialsExpired(false)
                .disabled(!account.isEnabled())
                .build();
    }
}
