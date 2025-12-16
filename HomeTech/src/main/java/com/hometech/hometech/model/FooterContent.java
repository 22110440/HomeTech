package com.hometech.hometech.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "footer_contents")
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class FooterContent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(length = 512)
    private String about;

    @Column(length = 255)
    private String hotline;

    @Column(length = 255)
    private String email;

    @Column(length = 512)
    private String address;

    @Column(length = 255)
    private String supportHours;

    @Column(length = 512)
    private String facebookUrl;

    @Column(length = 512)
    private String instagramUrl;

    @Column(length = 512)
    private String youtubeUrl;

    @Column(length = 512)
    private String tiktokUrl;

    @Column(nullable = false)
    private boolean active = true;

    @Column(updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    @PrePersist
    public void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    public void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}

