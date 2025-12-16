package com.hometech.hometech.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
public class TokenForgetPassword {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String token;

    @Column(nullable = false)
    private LocalDateTime expiryDate;

    @Column(nullable = false)
    private boolean used = false;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "account_id", nullable = false)
    private Account account;

    // ===== CONSTRUCTORS =====
    public TokenForgetPassword() {}

    public TokenForgetPassword(Long id, String token, LocalDateTime expiryDate,
                               boolean used, LocalDateTime createdAt, Account account) {
        this.id = id;
        this.token = token;
        this.expiryDate = expiryDate;
        this.used = used;
        this.createdAt = createdAt;
        this.account = account;
    }

    // ===== GETTERS & SETTERS =====
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public LocalDateTime getExpiryDate() {
        return expiryDate;
    }

    public void setExpiryDate(LocalDateTime expiryDate) {
        this.expiryDate = expiryDate;
    }

    public boolean isUsed() {
        return used;
    }

    public void setUsed(boolean used) {
        this.used = used;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public Account getAccount() {
        return account;
    }

    public void setAccount(Account account) {
        this.account = account;
    }

    // ===== TẠO BUILDER THỦ CÔNG (THAY CHO LOMBOK) =====
    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private Long id;
        private String token;
        private LocalDateTime expiryDate;
        private boolean used;
        private LocalDateTime createdAt;
        private Account account;

        public Builder id(Long id) {
            this.id = id;
            return this;
        }

        public Builder token(String token) {
            this.token = token;
            return this;
        }

        public Builder expiryDate(LocalDateTime expiryDate) {
            this.expiryDate = expiryDate;
            return this;
        }

        public Builder used(boolean used) {
            this.used = used;
            return this;
        }

        public Builder createdAt(LocalDateTime createdAt) {
            this.createdAt = createdAt;
            return this;
        }

        public Builder account(Account account) {
            this.account = account;
            return this;
        }

        public TokenForgetPassword build() {
            return new TokenForgetPassword(id, token, expiryDate, used, createdAt, account);
        }
    }
}
