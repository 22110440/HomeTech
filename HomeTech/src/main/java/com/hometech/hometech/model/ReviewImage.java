package com.hometech.hometech.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ReviewImage {

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public byte[] getImageData() {
        return imageData;
    }

    public void setImageData(byte[] imageData) {
        this.imageData = imageData;
    }

    public Review getReview() {
        return review;
    }

    public void setReview(Review review) {
        this.review = review;
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 🖼️ Dùng BLOB để lưu dữ liệu nhị phân của ảnh (thay vì URL)
    @Lob
    @Column(columnDefinition = "LONGBLOB", nullable = false)
    private byte[] imageData;

    // 🔗 Mối quan hệ nhiều ảnh thuộc 1 review
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "review_id", nullable = false)
    private Review review;
}
