// Account.java
package com.hometech.hometech.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.hometech.hometech.enums.RoleType;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "user"})
public class Account {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String username;

    @Column(nullable = false)
    @JsonIgnore
    private String password;

    public RoleType getRole() {
        return role;
    }

    public void setRole(RoleType role) {
        this.role = role;
    }

    @Column(nullable = false)
    private RoleType role;

    @Column(nullable = false)
    private boolean enabled = false; // Chưa kích hoạt

    // === THÊM CÁC TRƯỜNG XÁC THỰC EMAIL ===
    @Column(unique = true)
    private String email; // Email được chuyển từ User sang Account

    private String verificationToken; // Token xác thực email
    private boolean emailVerified = false; // Trạng thái xác thực
    private LocalDateTime verificationTokenExpiry; // Hết hạn token

    private LocalDateTime createdAt;

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }



    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public String getVerificationToken() {
        return verificationToken;
    }

    public void setVerificationToken(String verificationToken) {
        this.verificationToken = verificationToken;
    }

    public boolean isEmailVerified() {
        return emailVerified;
    }

    public void setEmailVerified(boolean emailVerified) {
        this.emailVerified = emailVerified;
    }

    public LocalDateTime getVerificationTokenExpiry() {
        return verificationTokenExpiry;
    }

    public void setVerificationTokenExpiry(LocalDateTime verificationTokenExpiry) {
        this.verificationTokenExpiry = verificationTokenExpiry;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    private LocalDateTime updatedAt;
    // ======================================

    @OneToOne
    @JoinColumn(name = "user_id")
    @JsonIgnore
    private User user;
}