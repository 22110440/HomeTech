package com.hometech.hometech.controller;

import com.hometech.hometech.Repository.PaymentRepository;
import com.hometech.hometech.model.Payment;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.util.UriComponentsBuilder;

/**
 * Xử lý callback PayOS (returnUrl / cancelUrl) không yêu cầu JWT.
 * - Cập nhật trạng thái payment ngay khi PayOS redirect.
 * - Chuyển tiếp về frontend với query dễ hiển thị.
 */
@Controller
public class PayOsPublicController {

    private final PaymentRepository paymentRepository;

    @Value("${frontend.base-url:http://localhost:5173}")
    private String frontendBaseUrl;

    public PayOsPublicController(PaymentRepository paymentRepository) {
        this.paymentRepository = paymentRepository;
    }

    @GetMapping("/payment/payos/callback")
    public ResponseEntity<Void> handleReturn(
            @RequestParam(required = false) String orderCode,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String message) {

        boolean isSuccess = status != null &&
                ("PAID".equalsIgnoreCase(status) ||
                        "SUCCESS".equalsIgnoreCase(status) ||
                        "SUCCEEDED".equalsIgnoreCase(status) ||
                        "COMPLETED".equalsIgnoreCase(status));

        if (isSuccess && orderCode != null) {
            paymentRepository.findByTxnRef(orderCode).ifPresent(payment -> {
                payment.setStatus("SUCCESS");
                payment.setTransactionStatus(status != null ? status : "SUCCESS");
                paymentRepository.save(payment);
            });
        }

        String redirectUrl = UriComponentsBuilder.fromHttpUrl(normalizeFrontendBase(frontendBaseUrl))
                .path("/payment/payos/result")
                .queryParam("orderCode", orderCode)
                .queryParam("success", isSuccess)
                .queryParam("message", message != null ? message : (isSuccess ? "Thanh toán thành công" : "Thanh toán thất bại"))
                .queryParam("status", status)
                .build()
                .toUriString();

        HttpHeaders headers = new HttpHeaders();
        headers.add(HttpHeaders.LOCATION, redirectUrl);
        return ResponseEntity.status(302).headers(headers).build();
    }

    @GetMapping("/payment/payos/cancel")
    public ResponseEntity<Void> handleCancel(
            @RequestParam(required = false) String orderCode,
            @RequestParam(required = false) String message) {

        String redirectUrl = UriComponentsBuilder.fromHttpUrl(normalizeFrontendBase(frontendBaseUrl))
                .path("/payment/payos/result")
                .queryParam("orderCode", orderCode)
                .queryParam("success", false)
                .queryParam("message", message != null ? message : "Thanh toán đã hủy")
                .queryParam("status", "CANCELLED")
                .build()
                .toUriString();

        HttpHeaders headers = new HttpHeaders();
        headers.add(HttpHeaders.LOCATION, redirectUrl);
        return ResponseEntity.status(302).headers(headers).build();
    }

    private String normalizeFrontendBase(String base) {
        if (base == null || base.isBlank()) return "http://localhost:5173";
        if (!base.startsWith("http")) {
            return "http://" + base;
        }
        return base;
    }
}

