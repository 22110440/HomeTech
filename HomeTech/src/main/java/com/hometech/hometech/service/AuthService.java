package com.hometech.hometech.service;

import com.hometech.hometech.Repository.AccountReposirory;
import com.hometech.hometech.Repository.TokenForgetPasswordRepository;
import com.hometech.hometech.enums.RoleType;
import com.hometech.hometech.model.Account;
import com.hometech.hometech.model.TokenForgetPassword;
import jakarta.mail.MessagingException;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Service
public class AuthService {

    private final AccountReposirory accountRepository;
    private final TokenForgetPasswordRepository tokenForgetPasswordRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final EmailService emailService;
    private final AuthenticationManager authenticationManager;
    private final CustomUserDetailsService userDetailsService;

    public AuthService(AccountReposirory accountRepository, 
                      TokenForgetPasswordRepository tokenForgetPasswordRepository,
                      PasswordEncoder passwordEncoder, 
                      JwtService jwtService, 
                      EmailService emailService,
                      AuthenticationManager authenticationManager, 
                      CustomUserDetailsService userDetailsService) {
        this.accountRepository = accountRepository;
        this.tokenForgetPasswordRepository = tokenForgetPasswordRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.emailService = emailService;
        this.authenticationManager = authenticationManager;
        this.userDetailsService = userDetailsService;
    }

    @Transactional
    public String register(String username, String email, String password) throws MessagingException {
        // Kiểm tra username đã tồn tại
        if (accountRepository.existsByUsername(username)) {
            throw new RuntimeException("Tên đăng nhập đã tồn tại");
        }

        // Kiểm tra email đã tồn tại
        if (accountRepository.existsByEmail(email)) {
            throw new RuntimeException("Email đã được sử dụng");
        }

        // Tạo tài khoản mới
        Account account = new Account();
        account.setUsername(username);
        account.setEmail(email);
        account.setPassword(passwordEncoder.encode(password));
        account.setRole(RoleType.USER);
        account.setEnabled(false);
        account.setEmailVerified(false);
        
        // Tạo verification token
        String verificationToken = UUID.randomUUID().toString();
        account.setVerificationToken(verificationToken);
        account.setCreatedAt(LocalDateTime.now());
        account.setUpdatedAt(LocalDateTime.now());

        accountRepository.save(account);

        // Gửi email xác thực
        emailService.sendVerificationEmail(email, verificationToken);

        return "Đăng ký thành công! Vui lòng kiểm tra email để xác thực tài khoản.";
    }

    @Transactional
    public String verifyEmail(String token) {
        Optional<Account> accountOpt = accountRepository.findByVerificationToken(token);
        
        if (accountOpt.isEmpty()) {
            throw new RuntimeException("Token xác thực không hợp lệ");
        }

        Account account = accountOpt.get();
        
        if (account.isEmailVerified()) {
            throw new RuntimeException("Email đã được xác thực trước đó");
        }

        account.setEmailVerified(true);
        account.setEnabled(true);
        account.setVerificationToken(null);
        account.setUpdatedAt(LocalDateTime.now());
        
        accountRepository.save(account);

        return "Xác thực email thành công! Bạn có thể đăng nhập ngay bây giờ.";
    }

    public AuthResponse login(String usernameOrEmail, String password) {
        try {
            // Xác thực thông tin đăng nhập
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(usernameOrEmail, password)
            );

            // Tìm tài khoản
            Account account = accountRepository.findByUsername(usernameOrEmail)
                    .or(() -> accountRepository.findByEmail(usernameOrEmail))
                    .orElseThrow(() -> new RuntimeException("Tài khoản không tồn tại"));

            // Kiểm tra tài khoản đã được kích hoạt
            if (!account.isEnabled()) {
                throw new RuntimeException("Tài khoản chưa được kích hoạt. Vui lòng kiểm tra email để xác thực.");
            }

            // Kiểm tra email đã được xác thực
            if (!account.isEmailVerified()) {
                throw new RuntimeException("Email chưa được xác thực. Vui lòng kiểm tra email để xác thực.");
            }

            // Tạo JWT token
            UserDetails userDetails = userDetailsService.loadUserByUsername(account.getUsername());
            String accessToken = jwtService.generateToken(userDetails);
            String refreshToken = jwtService.generateRefreshToken(userDetails);

            return new AuthResponse(
                    accessToken,
                    refreshToken,
                    account.getUsername(),
                    account.getEmail(),
                    account.getRole().name(),
                    "Đăng nhập thành công"
            );

        } catch (Exception e) {
            throw new RuntimeException("Tên đăng nhập hoặc mật khẩu không đúng");
        }
    }

    @Transactional
    public String forgotPassword(String email) throws MessagingException {
        Account account = accountRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy tài khoản với email này"));

        if (!account.isEnabled() || !account.isEmailVerified()) {
            throw new RuntimeException("Tài khoản chưa được kích hoạt hoặc email chưa được xác thực");
        }

        // Vô hiệu hóa các token cũ
        tokenForgetPasswordRepository.findByAccountAndIsUsedFalse(account)
                .forEach(token -> {
                    token.setUsed(true);
                    tokenForgetPasswordRepository.save(token);
                });

        // Tạo token đặt lại mật khẩu mới
        String resetToken = UUID.randomUUID().toString();
        TokenForgetPassword tokenForgetPassword = new TokenForgetPassword();
        tokenForgetPassword.setToken(resetToken);
        tokenForgetPassword.setAccount(account);
        tokenForgetPassword.setExpireTime(LocalDateTime.now().plusHours(1)); // Hết hạn sau 1 giờ
        tokenForgetPassword.setUsed(false);
        tokenForgetPassword.setCreatedAt(LocalDateTime.now());

        tokenForgetPasswordRepository.save(tokenForgetPassword);

        // Gửi email đặt lại mật khẩu
        emailService.sendPasswordResetEmail(email, resetToken);

        return "Đã gửi link đặt lại mật khẩu đến email của bạn. Vui lòng kiểm tra email.";
    }

    @Transactional
    public String resetPassword(String token, String newPassword) {
        TokenForgetPassword resetToken = tokenForgetPasswordRepository.findByTokenAndIsUsedFalse(token)
                .orElseThrow(() -> new RuntimeException("Token đặt lại mật khẩu không hợp lệ hoặc đã được sử dụng"));

        if (resetToken.getExpireTime().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Token đặt lại mật khẩu đã hết hạn");
        }

        Account account = resetToken.getAccount();
        account.setPassword(passwordEncoder.encode(newPassword));
        account.setUpdatedAt(LocalDateTime.now());
        accountRepository.save(account);

        // Đánh dấu token đã được sử dụng
        resetToken.setUsed(true);
        tokenForgetPasswordRepository.save(resetToken);

        return "Đặt lại mật khẩu thành công! Bạn có thể đăng nhập với mật khẩu mới.";
    }

    public String refreshToken(String refreshToken) {
        try {
            String username = jwtService.extractUsername(refreshToken);
            UserDetails userDetails = userDetailsService.loadUserByUsername(username);
            
            if (jwtService.isTokenValid(refreshToken, userDetails)) {
                String newAccessToken = jwtService.generateToken(userDetails);
                return newAccessToken;
            } else {
                throw new RuntimeException("Refresh token không hợp lệ");
            }
        } catch (Exception e) {
            throw new RuntimeException("Refresh token không hợp lệ");
        }
    }

    // Response class cho login
    public static class AuthResponse {
        private String accessToken;
        private String refreshToken;
        private String username;
        private String email;
        private String role;
        private String message;

        public AuthResponse(String accessToken, String refreshToken, String username, String email, String role, String message) {
            this.accessToken = accessToken;
            this.refreshToken = refreshToken;
            this.username = username;
            this.email = email;
            this.role = role;
            this.message = message;
        }

        // Getters and Setters
        public String getAccessToken() { return accessToken; }
        public void setAccessToken(String accessToken) { this.accessToken = accessToken; }

        public String getRefreshToken() { return refreshToken; }
        public void setRefreshToken(String refreshToken) { this.refreshToken = refreshToken; }

        public String getUsername() { return username; }
        public void setUsername(String username) { this.username = username; }

        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }

        public String getRole() { return role; }
        public void setRole(String role) { this.role = role; }

        public String getMessage() { return message; }
        public void setMessage(String message) { this.message = message; }
    }
}
