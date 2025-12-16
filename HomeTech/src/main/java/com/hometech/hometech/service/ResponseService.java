package com.hometech.hometech.service;

import com.hometech.hometech.model.Admin;
import com.hometech.hometech.model.Response;
import com.hometech.hometech.model.Review;
import com.hometech.hometech.Repository.AdminRepository;
import com.hometech.hometech.Repository.ResponseRepository;
import com.hometech.hometech.Repository.ReviewRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class ResponseService {

    private final ResponseRepository responseRepository;
    private final ReviewRepository reviewRepository;
    private final AdminRepository adminRepository;

    public ResponseService(ResponseRepository responseRepository,
                           ReviewRepository reviewRepository,
                           AdminRepository adminRepository) {
        this.responseRepository = responseRepository;
        this.reviewRepository = reviewRepository;
        this.adminRepository = adminRepository;
    }

    public Response addOrUpdateResponse(long reviewId, long adminId, String content) {

        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đánh giá với ID: " + reviewId));

        Admin admin = adminRepository.findById(adminId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy admin với ID: " + adminId));

        // Kiểm tra review đã có phản hồi chưa
        Response response = responseRepository.findByReviewId(reviewId).orElse(null);

        if (response == null) {
            // 👉 CHƯA CÓ → TẠO MỚI
            response = new Response();
            response.setReview(review);
            response.setAdmin(admin);
            response.setContent(content);
            response.setRepliedAt(LocalDateTime.now());
        } else {
            // 👉 ĐÃ CÓ → UPDATE
            if (!response.getAdmin().getId().equals(adminId)) {
                throw new RuntimeException("Bạn không có quyền sửa phản hồi này.");
            }

            response.setContent(content);
            response.setRepliedAt(LocalDateTime.now());
        }

        return responseRepository.save(response);
    }


    // Lấy tất cả phản hồi
    public List<Response> getAllResponses() {
        return responseRepository.findAll();
    }

    // Lấy phản hồi theo review
    public Response getResponseByReview(Long reviewId) {
        return responseRepository.findByReviewId(reviewId)
                .orElse(null); // Hoặc throw exception nếu cần
    }
    // Xóa phản hồi
    public void deleteResponse(int responseId) {
        Response response = responseRepository.findById(responseId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy phản hồi với ID: " + responseId));
        responseRepository.delete(response);
    }

}