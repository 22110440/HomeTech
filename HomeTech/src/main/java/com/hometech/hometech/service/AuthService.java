package com.hometech.hometech.service;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.hometech.hometech.Repository.*;
import com.hometech.hometech.enums.RoleType;
import com.hometech.hometech.model.*;
import jakarta.mail.MessagingException;
import lombok.*;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.net.URL;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class AuthService {

    private final AccountRepository accountRepository;
    private final TokenForgetPasswordRepository tokenForgetPasswordRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final EmailService emailService;
    private final AuthenticationManager authenticationManager;
    private final CustomUserDetailsService userDetailsService;
    private final UserRepository userRepository;
    private final AdminRepository adminRepository;
    private final GoogleVerifierService googleVerifierService;

    public AuthService(AccountRepository accountRepository,
                       TokenForgetPasswordRepository tokenForgetPasswordRepository,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService,
                       EmailService emailService,
                       AuthenticationManager authenticationManager,
                       CustomUserDetailsService userDetailsService,
                       UserRepository userRepository,
                       AdminRepository adminRepository,
                       GoogleVerifierService googleVerifierService) {
        this.accountRepository = accountRepository;
        this.tokenForgetPasswordRepository = tokenForgetPasswordRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.emailService = emailService;
        this.authenticationManager = authenticationManager;
        this.userDetailsService = userDetailsService;
        this.userRepository = userRepository;
        this.adminRepository = adminRepository;
        this.googleVerifierService = googleVerifierService;
    }

    // === ĐĂNG KÝ USER (Customer) ===
    @Transactional
    public String register(String username, String email, String password) throws MessagingException {
        if (accountRepository.existsByUsername(username)) {
            throw new RuntimeException("Tên đăng nhập đã tồn tại");
        }
        if (accountRepository.existsByEmail(email)) {
            throw new RuntimeException("Email đã được sử dụng");
        }

        Customer customer = new Customer();
        customer.setFullName(username);
        customer.setPhone(null);
        customer.setGender(null);
        customer.setLoyaltyPoints(0);
        customer.setCreatedAt(LocalDateTime.now());
        customer.setUpdatedAt(LocalDateTime.now());

        Address address = new Address();
        address.setStreet("Chưa cập nhật");
        address.setWard("Chưa cập nhật");
        address.setDistrict("Chưa cập nhật");
        address.setCity("Chưa cập nhật");
        address.setCustomer(customer);
        customer.getAddresses().add(address);

        Account account = new Account();
        account.setUsername(username);
        account.setEmail(email);
        account.setPassword(passwordEncoder.encode(password));
        account.setRole(RoleType.USER);
        account.setEnabled(false);
        account.setEmailVerified(false);
        account.setVerificationToken(UUID.randomUUID().toString());
        account.setVerificationTokenExpiry(LocalDateTime.now().plusMinutes(15));
        account.setCreatedAt(LocalDateTime.now());
        account.setUpdatedAt(LocalDateTime.now());

        customer.setAccount(account);
        account.setUser(customer);

        userRepository.save(customer);
        accountRepository.save(account);

        emailService.sendVerificationEmail(email, account.getVerificationToken());

        return "Đăng ký thành công! Vui lòng kiểm tra email để xác thực tài khoản.";
    }

    // === ĐĂNG KÝ ADMIN ===
    @Transactional
    public String registerAdmin(String username, String email, String password) throws MessagingException {
        if (accountRepository.existsByUsername(username)) {
            throw new RuntimeException("Tên đăng nhập đã tồn tại");
        }
        if (accountRepository.existsByEmail(email)) {
            throw new RuntimeException("Email đã được sử dụng");
        }

        Admin admin = new Admin();
        admin.setFullName(username);
        admin.setPhone(null);
        admin.setCreatedAt(LocalDateTime.now());
        admin.setUpdatedAt(LocalDateTime.now());

        Account account = new Account();
        account.setUsername(username);
        account.setEmail(email);
        account.setPassword(passwordEncoder.encode(password));
        account.setRole(RoleType.ADMIN);
        account.setEnabled(false);
        account.setEmailVerified(false);
        account.setVerificationToken(UUID.randomUUID().toString());
        account.setVerificationTokenExpiry(LocalDateTime.now().plusMinutes(15));
        account.setCreatedAt(LocalDateTime.now());
        account.setUpdatedAt(LocalDateTime.now());

        admin.setAccount(account);
        account.setUser(admin);

        adminRepository.save(admin);
        accountRepository.save(account);

        emailService.sendVerificationEmail(email, account.getVerificationToken());

        return "Đăng ký admin thành công! Vui lòng kiểm tra email để xác thực.";
    }

    // === XÁC THỰC EMAIL ===
    @Transactional
    public String verifyEmail(String token) {
        Account account = accountRepository.findByVerificationToken(token)
                .orElseThrow(() -> new RuntimeException("Token xác thực không hợp lệ"));

        if (account.isEmailVerified()) {
            throw new RuntimeException("Email đã được xác thực trước đó");
        }

        if (account.getVerificationTokenExpiry().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Token đã hết hạn. Vui lòng đăng ký lại.");
        }

        account.setEmailVerified(true);
        account.setEnabled(true);
        account.setVerificationToken(null);
        account.setVerificationTokenExpiry(null);
        account.setUpdatedAt(LocalDateTime.now());
        accountRepository.save(account);

        return "Xác thực email thành công! Bạn có thể đăng nhập.";
    }

    // === ĐĂNG NHẬP CHUNG ===
    public AuthResponse login(String usernameOrEmail, String password) {
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(usernameOrEmail, password)
            );

            Account account = accountRepository.findByUsername(usernameOrEmail)
                    .or(() -> accountRepository.findByEmail(usernameOrEmail))
                    .orElseThrow(() -> new RuntimeException("Tài khoản không tồn tại"));

            if (!account.isEnabled()) {
                throw new RuntimeException("Tài khoản chưa được kích hoạt.");
            }
            if (!account.isEmailVerified()) {
                throw new RuntimeException("Email chưa được xác thực.");
            }

            UserDetails userDetails = userDetailsService.loadUserByUsername(account.getUsername());
            String accessToken = jwtService.generateToken(userDetails);
            String refreshToken = jwtService.generateRefreshToken(userDetails);

            return new AuthResponse(
                    accessToken, refreshToken,
                    account.getUsername(), account.getEmail(),
                    account.getRole().name(), "Đăng nhập thành công"
            );

        } catch (Exception e) {
            throw new RuntimeException("Tên đăng nhập hoặc mật khẩu không đúng");
        }
    }

    // === ĐĂNG NHẬP ADMIN (ĐÃ SỬA LỖI setMessage) ===
    public AuthResponse loginAdmin(String usernameOrEmail, String password) {
        AuthResponse response = login(usernameOrEmail, password);
        if (!RoleType.ADMIN.name().equals(response.getRole())) {
            throw new RuntimeException("Bạn không có quyền truy cập trang quản trị.");
        }
        response.setMessage("Đăng nhập admin thành công"); // BÂY GIỜ HỢP LỆ
        
        // Lấy adminId
        Account account = accountRepository.findByUsername(usernameOrEmail)
                .or(() -> accountRepository.findByEmail(usernameOrEmail))
                .orElse(null);
        if (account != null && account.getUser() instanceof Admin) {
            Admin admin = (Admin) account.getUser();
            response.setAdminId(admin.getId());
        }
        
        return response;
    }

    // === QUÊN MẬT KHẨU ===
    @Transactional
    public String forgotPassword(String email) throws MessagingException {
        Account account = accountRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy tài khoản với email này"));

        if (!account.isEnabled() || !account.isEmailVerified()) {
            throw new RuntimeException("Tài khoản chưa được kích hoạt hoặc email chưa xác thực");
        }

        tokenForgetPasswordRepository.findByAccountAndUsedFalse(account)
                .forEach(t -> {
                    t.setUsed(true);
                    tokenForgetPasswordRepository.save(t);
                });

        String token = UUID.randomUUID().toString();
        TokenForgetPassword resetToken = TokenForgetPassword.builder()
                .token(token)
                .account(account)
                .expiryDate(LocalDateTime.now().plusHours(1))
                .used(false)
                .createdAt(LocalDateTime.now())
                .build();

        tokenForgetPasswordRepository.save(resetToken);

        emailService.sendPasswordResetEmail(email, token);
        return "Đã gửi link đặt lại mật khẩu đến email của bạn.";
    }

    @Transactional
    public String resetPassword(String token, String newPassword) {
        TokenForgetPassword resetToken = tokenForgetPasswordRepository.findByTokenAndUsedFalse(token)
                .orElseThrow(() -> new RuntimeException("Token không hợp lệ hoặc đã được sử dụng"));

        if (resetToken.getExpiryDate().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Token đã hết hạn");
        }

        Account account = resetToken.getAccount();
        account.setPassword(passwordEncoder.encode(newPassword));
        account.setUpdatedAt(LocalDateTime.now());
        accountRepository.save(account);

        resetToken.setUsed(true);
        tokenForgetPasswordRepository.save(resetToken);

        return "Đặt lại mật khẩu thành công!";
    }

    public String refreshToken(String refreshToken) {
        try {
            String username = jwtService.extractUsername(refreshToken);
            UserDetails userDetails = userDetailsService.loadUserByUsername(username);
            if (jwtService.isTokenValid(refreshToken, userDetails)) {
                return jwtService.generateToken(userDetails);
            }
            throw new RuntimeException("Refresh token không hợp lệ");
        } catch (Exception e) {
            throw new RuntimeException("Refresh token không hợp lệ");
        }
    }
    // === ĐĂNG NHẬP BẰNG GOOGLE ===
    @Transactional
    public AuthResponse loginWithGoogle(String idToken) {
        GoogleIdToken.Payload payload;
        try {
            payload = googleVerifierService.verifyToken(idToken);
        } catch (Exception e) {
            throw new RuntimeException("Xác thực Google thất bại: " + e.getMessage());
        }

        String email = payload.getEmail();
        String name = (String) payload.get("name");

        // ✅ Lấy ảnh đại diện
        byte[] pictureBytes = null;
        String pictureUrl = (String) payload.get("picture");
        if (pictureUrl != null && !pictureUrl.isEmpty()) {
            try {
                pictureBytes = new URL(pictureUrl).openStream().readAllBytes();
            } catch (IOException e) {
                System.err.println("Không thể tải ảnh từ Google: " + e.getMessage());
            }
        }

        // ✅ Tìm account
        Account account = accountRepository.findByEmail(email).orElse(null);

        if (account == null) {
            // === Tạo mới Customer & Account ===
            Customer customer = new Customer();
            customer.setFullName(name != null ? name : email);
            customer.setCreatedAt(LocalDateTime.now());
            customer.setUpdatedAt(LocalDateTime.now());
            customer.setPictureBlob(pictureBytes);
            customer.setPictureContentType("image/jpeg");

            Account newAccount = new Account();
            newAccount.setUsername(email);
            newAccount.setEmail(email);
            newAccount.setPassword(passwordEncoder.encode(UUID.randomUUID().toString())); // mật khẩu ngẫu nhiên
            newAccount.setRole(RoleType.USER);
            newAccount.setEnabled(true);
            newAccount.setEmailVerified(true);
            newAccount.setCreatedAt(LocalDateTime.now());
            newAccount.setUpdatedAt(LocalDateTime.now());

            // ✅ Liên kết 2 chiều
            newAccount.setUser(customer);
            customer.setAccount(newAccount);

            // ✅ Lưu 1 lần thôi — Hibernate sẽ cascade
            account = accountRepository.save(newAccount);
        } else {
            // === Cập nhật thông tin nếu đã có ===
            User user = account.getUser();
            if (user != null) {
                if (name != null && (user.getFullName() == null || user.getFullName().isEmpty())) {
                    user.setFullName(name);
                }
                if (pictureBytes != null && (user.getPictureBlob() == null || user.getPictureBlob().length == 0)) {
                    user.setPictureBlob(pictureBytes);
                    user.setPictureContentType("image/jpeg");
                }
                user.setUpdatedAt(LocalDateTime.now());
                userRepository.save(user);
            }
        }

        // ✅ Sinh JWT token
        UserDetails userDetails = userDetailsService.loadUserByUsername(account.getUsername());
        String accessToken = jwtService.generateToken(userDetails);
        String refreshToken = jwtService.generateRefreshToken(userDetails);

        return new AuthResponse(
                accessToken,
                refreshToken,
                account.getUsername(),
                account.getEmail(),
                account.getRole().name(),
                "Đăng nhập Google thành công"
        );
    }

    // === AuthResponse – ĐÃ SỬA: DÙNG @Getter + @Setter ===

    public static class AuthResponse {
        private String accessToken;
        private String refreshToken;
        public AuthResponse() {}

        public AuthResponse(String accessToken, String refreshToken, String username, String email, String role, String message) {
            this.accessToken = accessToken;
            this.refreshToken = refreshToken;
            this.username = username;
            this.email = email;
            this.role = role;
            this.message = message;
        }

        public AuthResponse(String accessToken, String refreshToken, String username, String email, String role, String message, Long adminId) {
            this.accessToken = accessToken;
            this.refreshToken = refreshToken;
            this.username = username;
            this.email = email;
            this.role = role;
            this.message = message;
            this.adminId = adminId;
        }


        public String getUsername() {
            return username;
        }

        public void setUsername(String username) {
            this.username = username;
        }

        public String getAccessToken() {
            return accessToken;
        }

        public void setAccessToken(String accessToken) {
            this.accessToken = accessToken;
        }

        public String getRefreshToken() {
            return refreshToken;
        }

        public void setRefreshToken(String refreshToken) {
            this.refreshToken = refreshToken;
        }

        public String getEmail() {
            return email;
        }

        public void setEmail(String email) {
            this.email = email;
        }

        public String getRole() {
            return role;
        }

        public void setRole(String role) {
            this.role = role;
        }

        public String getMessage() {
            return message;
        }

        public void setMessage(String message) {
            this.message = message;
        }

        private String username;
        private String email;
        private String role;
        private String message;
        private Long adminId;

        public Long getAdminId() {
            return adminId;
        }

        public void setAdminId(Long adminId) {
            this.adminId = adminId;
        }
    }
}