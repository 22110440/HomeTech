package com.hometech.hometech.controller.Api;

import com.hometech.hometech.model.Review;
import com.hometech.hometech.model.Response;
import com.hometech.hometech.service.ReviewService;
import com.hometech.hometech.service.ResponseService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/reviews")
public class ReviewRestController {

    private final ReviewService reviewService;
    private final ResponseService responseService;

    public ReviewRestController(ReviewService reviewService, ResponseService responseService) {
        this.reviewService = reviewService;
        this.responseService = responseService;
    }

    private ResponseEntity<Map<String, Object>> buildResponse(
            boolean success, String message, Object data, HttpStatus status
    ) {
        Map<String, Object> map = new HashMap<>();
        map.put("success", success);
        map.put("message", message);
        map.put("data", data);
        return new ResponseEntity<>(map, status);
    }

    // ==============================
    // 1. Tạo hoặc sửa review
    // ==============================
    @PostMapping
    public ResponseEntity<Map<String, Object>> createOrUpdateReview(
            @RequestParam long productId,
            @RequestParam long customerId,
            @RequestParam int rating,
            @RequestParam String content,
            @RequestBody(required = false) List<String> base64Images
    ) {
        try {
            Review review = reviewService.addOrUpdateReview(productId, customerId, rating, content, base64Images);
            return buildResponse(true, "Đánh giá đã được tạo/cập nhật", review, HttpStatus.OK);
        } catch (Exception e) {
            return buildResponse(false, e.getMessage(), null, HttpStatus.BAD_REQUEST);
        }
    }

    // ==============================
    // 2. Xóa đánh giá (trong 30 phút)
    // ==============================
    @DeleteMapping("/{reviewId}")
    public ResponseEntity<Map<String, Object>> deleteReview(
            @PathVariable long reviewId,
            @RequestParam int customerId
    ) {
        try {
            reviewService.deleteReview(reviewId, customerId);
            return buildResponse(true, "Đã xóa đánh giá", null, HttpStatus.OK);
        } catch (Exception e) {
            return buildResponse(false, e.getMessage(), null, HttpStatus.BAD_REQUEST);
        }
    }

    // ==============================
    // 3. Lấy đánh giá hiển thị theo sản phẩm
    // ==============================
    @GetMapping("/product/{productId}")
    public ResponseEntity<Map<String, Object>> getVisibleReviews(@PathVariable long productId) {
        try {
            List<Review> reviews = reviewService.getVisibleReviewsByProduct(productId);
            return buildResponse(true, "Danh sách đánh giá hiển thị", reviews, HttpStatus.OK);
        } catch (Exception e) {
            return buildResponse(false, e.getMessage(), null, HttpStatus.NOT_FOUND);
        }
    }

    // ==============================
    // 4. Admin ẩn đánh giá
    // ==============================
    @PutMapping("/{reviewId}/hide")
    public ResponseEntity<Map<String, Object>> hideReview(@PathVariable long reviewId) {
        try {
            reviewService.hideReview(reviewId);
            return buildResponse(true, "Đánh giá đã bị ẩn", null, HttpStatus.OK);
        } catch (Exception e) {
            return buildResponse(false, e.getMessage(), null, HttpStatus.BAD_REQUEST);
        }
    }
    @PutMapping("/{reviewId}/show")
    public ResponseEntity<Map<String, Object>> showReview(@PathVariable long reviewId) {
        try {
            reviewService.hideReview(reviewId);
            return buildResponse(true, "Đánh giá đã được hiển thị", null, HttpStatus.OK);
        } catch (Exception e) {
            return buildResponse(false, e.getMessage(), null, HttpStatus.BAD_REQUEST);
        }
    }

    // ==============================
    // 5. Lấy rating trung bình sản phẩm
    // ==============================
    @GetMapping("/rating/{productId}")
    public ResponseEntity<Map<String, Object>> getAverageRating(@PathVariable long productId) {
        try {
            double avg = reviewService.getAverageRating(productId);
            return buildResponse(true, "Rating trung bình", avg, HttpStatus.OK);
        } catch (Exception e) {
            return buildResponse(false, e.getMessage(), null, HttpStatus.NOT_FOUND);
        }
    }

    // ==============================
    // 6. Admin phản hồi review
    // ==============================
    @PostMapping("/{reviewId}/response")
    public ResponseEntity<Map<String, Object>> addResponse(
            @PathVariable long reviewId,
            @RequestParam long adminId,
            @RequestParam String content
    ) {
        try {
            Response response = responseService.addOrUpdateResponse(reviewId, adminId, content);
            return buildResponse(true, "Phản hồi đã được thêm", response, HttpStatus.CREATED);
        } catch (Exception e) {
            return buildResponse(false, e.getMessage(), null, HttpStatus.BAD_REQUEST);
        }
    }


    // ==============================
    // 8. Xóa phản hồi
    // ==============================
    @DeleteMapping("/response/{responseId}")
    public ResponseEntity<Map<String, Object>> deleteResponse(@PathVariable int responseId) {
        try {
            responseService.deleteResponse(responseId);
            return buildResponse(true, "Phản hồi đã bị xoá", null, HttpStatus.OK);
        } catch (Exception e) {
            return buildResponse(false, e.getMessage(), null, HttpStatus.BAD_REQUEST);
        }
    }

    // ==============================
    // 9. Lấy phản hồi theo review
    // ==============================
    @GetMapping("/{reviewId}/response")
    public ResponseEntity<Map<String, Object>> getResponseByReview(@PathVariable Long reviewId) {
        Response res = responseService.getResponseByReview(reviewId);
        return buildResponse(true, "Phản hồi của review", res, HttpStatus.OK);
    }

    // ==============================
    // 10. Lấy toàn bộ phản hồi
    // ==============================
    @GetMapping("/responses")
    public ResponseEntity<Map<String, Object>> getAllResponses() {
        List<Response> responses = responseService.getAllResponses();
        return buildResponse(true, "Danh sách phản hồi", responses, HttpStatus.OK);
    }

    // ==============================
    // 11. Lấy tất cả đánh giá (cho admin)
    // ==============================
    @GetMapping("/all")
    public ResponseEntity<Map<String, Object>> getAllReviews() {
        try {
            List<Review> reviews = reviewService.getAllReviews();
            return buildResponse(true, "Danh sách tất cả đánh giá", reviews, HttpStatus.OK);
        } catch (Exception e) {
            return buildResponse(false, e.getMessage(), null, HttpStatus.BAD_REQUEST);
        }
    }
}
