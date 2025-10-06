package com.hometech.hometech.service;

import com.hometech.hometech.Repository.AccountReposirory;
import com.hometech.hometech.Repository.UserRepository;
import com.hometech.hometech.enums.RoleType;
import com.hometech.hometech.model.Account;
import com.hometech.hometech.model.User;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.Optional;
import java.util.UUID;

@Service
public class OAuth2UserService extends DefaultOAuth2UserService {

    private final UserRepository userRepository;
    private final AccountReposirory accountRepository;

    public OAuth2UserService(UserRepository userRepository, AccountReposirory accountRepository) {
        this.userRepository = userRepository;
        this.accountRepository = accountRepository;
    }

    @Override
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        return super.loadUser(userRequest);
    }

    @Transactional
    public UserDetails processOAuth2User(OAuth2User oAuth2User) {
        String email = oAuth2User.getAttribute("email");
        String name = oAuth2User.getAttribute("name");
        String googleId = oAuth2User.getAttribute("sub"); // Google user ID
        String picture = oAuth2User.getAttribute("picture");

        if (email == null || email.isEmpty()) {
            throw new RuntimeException("Email không được cung cấp bởi Google");
        }

        // Tìm user theo Google ID trước
        User existingUser = userRepository.findByGoogleId(googleId);
        
        if (existingUser != null) {
            // User đã tồn tại với Google ID này
            return createUserDetails(existingUser.getAccount());
        }

        // Kiểm tra xem có account nào với email này không
        Optional<Account> existingAccount = accountRepository.findByEmail(email);
        
        if (existingAccount.isPresent()) {
            // Account đã tồn tại với email này, liên kết với Google
            Account account = existingAccount.get();
            
            // Tìm user tương ứng hoặc tạo mới
            User user = userRepository.findByAccount(account);
            if (user == null) {
                user = new User();
                user.setAccount(account);
            }
            
            // Cập nhật thông tin Google
            user.setGoogleId(googleId);
            user.setEmail(email);
            user.setName(name);
            user.setPictureUrl(picture);
            user.setActive(true);
            
            userRepository.save(user);
            
            // Đảm bảo account được kích hoạt
            if (!account.isEnabled() || !account.isEmailVerified()) {
                account.setEnabled(true);
                account.setEmailVerified(true);
                account.setVerificationToken(null);
                account.setUpdatedAt(LocalDateTime.now());
                accountRepository.save(account);
            }
            
            return createUserDetails(account);
        }

        // Tạo account và user mới
        return createNewUserFromOAuth2(email, name, googleId, picture);
    }

    private UserDetails createNewUserFromOAuth2(String email, String name, String googleId, String picture) {
        // Tạo username unique từ email
        String baseUsername = email.split("@")[0];
        String username = generateUniqueUsername(baseUsername);

        // Tạo Account mới
        Account account = new Account();
        account.setUsername(username);
        account.setEmail(email);
        account.setPassword(UUID.randomUUID().toString()); // Random password vì không cần
        account.setRole(RoleType.USER);
        account.setEnabled(true);
        account.setEmailVerified(true); // Google đã xác thực email
        account.setCreatedAt(LocalDateTime.now());
        account.setUpdatedAt(LocalDateTime.now());
        
        account = accountRepository.save(account);

        // Tạo User mới
        User user = new User();
        user.setAccount(account);
        user.setGoogleId(googleId);
        user.setEmail(email);
        user.setName(name);
        user.setFullName(name);
        user.setPictureUrl(picture);
        user.setActive(true);
        
        userRepository.save(user);

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
                .password(account.getPassword())
                .authorities(Collections.singletonList(
                    new SimpleGrantedAuthority("ROLE_" + account.getRole().name())
                ))
                .accountExpired(false)
                .accountLocked(false)
                .credentialsExpired(false)
                .disabled(!account.isEnabled())
                .build();
    }
}
