package com.hometech.hometech.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.hometech.hometech.enums.BannerType;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "banners")
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Banner {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private BannerType type = BannerType.BANNER;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(length = 512)
    private String subtitle;

    @Column(nullable = false, length = 1024)
    private String imageUrl;

    @Column(length = 1024)
    private String redirectUrl;

    @Column(length = 80)
    private String buttonText;

    @Column(nullable = false)
    private Integer displayOrder = 0;

    @Column(nullable = false)
    private boolean active = true;

    @Column(nullable = false)
    private boolean showOnMobile = true;

    private LocalDateTime startAt;

    private LocalDateTime endAt;

    @Column(updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    @PrePersist
    public void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
        if (displayOrder == null) {
            displayOrder = 0;
        }
    }

    @PreUpdate
    public void onUpdate() {
        this.updatedAt = LocalDateTime.now();
        if (displayOrder == null) {
            displayOrder = 0;
        }
    }
}

