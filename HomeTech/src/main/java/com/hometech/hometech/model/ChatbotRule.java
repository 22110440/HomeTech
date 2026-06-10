package com.hometech.hometech.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "chatbot_rules")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChatbotRule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Keywords, comma separated (e.g. "gia, bao nhieu, bao gia")
    @Column(nullable = true, length = 500)
    private String keyword;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String response;

    @Column(name = "is_active")
    private boolean isActive = true;

    @Column(name = "is_fallback")
    private boolean isFallback = false;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        this.createdAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getKeyword() {
        return keyword;
    }

    public void setKeyword(String keyword) {
        this.keyword = keyword;
    }

    public String getResponse() {
        return response;
    }

    public void setResponse(String response) {
        this.response = response;
    }

    public boolean isActive() {
        return isActive;
    }

    public void setActive(boolean active) {
        isActive = active;
    }

    public boolean isFallback() {
        return isFallback;
    }

    public void setFallback(boolean fallback) {
        isFallback = fallback;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
