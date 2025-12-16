package com.hometech.hometech.service;

import com.hometech.hometech.model.Customer;
import com.hometech.hometech.model.Product;
import com.hometech.hometech.model.Review;
import com.hometech.hometech.model.ReviewImage;
import com.hometech.hometech.Repository.CustomerRepository;
import com.hometech.hometech.Repository.ProductRepository;
import com.hometech.hometech.Repository.ReviewRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Optional;

@Service
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final ProductRepository productRepository;
    private final CustomerRepository customerRepository;

    public ReviewService(ReviewRepository reviewRepository,
                         ProductRepository productRepository,
                         CustomerRepository customerRepository) {
        this.reviewRepository = reviewRepository;
        this.productRepository = productRepository;
        this.customerRepository = customerRepository;
    }

    // Đánh giá sản phẩm (thêm mới hoặc cập nhật nếu tồn tại)ơ
    public Review addOrUpdateReview(long productId, long customerId, int rating, String content, List<String> imageBase64List) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy sản phẩm với ID: " + productId));

        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy khách hàng với ID: " + customerId));

        Optional<Review> existingReviewOpt = reviewRepository.findByCustomerAndProduct(customer, product);
        Review review = existingReviewOpt.orElse(new Review());

        if (existingReviewOpt.isPresent()) {
            // Kiểm tra thời gian sửa (chỉ cho phép sửa trong 7 ngày)
            LocalDateTime createdAt = review.getCreatedAt();
            if (ChronoUnit.DAYS.between(createdAt, LocalDateTime.now()) > 7) {
                throw new RuntimeException("Không thể sửa đánh giá sau 7 ngày kể từ khi tạo.");
            }
        } else {
            // Nếu là đánh giá mới
            review.setCustomer(customer);
            review.setProduct(product);
        }

        review.setRating(rating);
        review.setContent(content);

        // Xóa ảnh cũ và thêm ảnh mới
        review.getImages().clear();
        if (imageBase64List != null && !imageBase64List.isEmpty()) {
            for (String base64 : imageBase64List) {
                byte[] imageData = Base64.getDecoder().decode(base64);
                ReviewImage image = new ReviewImage();
                image.setImageData(imageData);
                image.setReview(review);
                review.getImages().add(image);
            }
        }

        return reviewRepository.save(review);
    }

    // Hủy đánh giá (chỉ trong 30 phút sau khi tạo)
    public void deleteReview(long reviewId, long customerId) {
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đánh giá với ID: " + reviewId));

        if (!review.getCustomer().getId().equals(customerId)) {
            System.out.println("customerId = " + customerId);
            System.out.println("review owner = " + review.getCustomer().getId());
            throw new RuntimeException("Bạn không có quyền xóa đánh giá này.");
        }

        LocalDateTime createdAt = review.getCreatedAt();
        if (ChronoUnit.MINUTES.between(createdAt, LocalDateTime.now()) > 30) {

            throw new RuntimeException("Không thể xóa đánh giá sau 30 phút kể từ khi tạo.");
        }

        reviewRepository.delete(review);
    }

    // Xem đánh giá theo sản phẩm (chỉ hiển thị chưa ẩn)
    public List<Review> getVisibleReviewsByProduct(long productId) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy sản phẩm với ID: " + productId));
        return reviewRepository.findByProductAndHiddenFalse(product);
    }

    // Ẩn đánh giá (cho admin)
    public void hideReview(long reviewId) {
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đánh giá với ID: " + reviewId));
        review.setHidden(true);
        reviewRepository.save(review);
    }
    // hiện đánh giá (cho admin)
    public void showReview(long reviewId) {
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đánh giá với ID: " + reviewId));
        review.setHidden(false);
        reviewRepository.save(review);
    }

    public double getAverageRating(long productId) {
        return reviewRepository.getAverageRating(productId).orElse(0.0);
    }

    // Lấy tất cả đánh giá (cho admin)
    public List<Review> getAllReviews() {
        return reviewRepository.findAll();
    }
}