package com.hometech.hometech.controller.Api;

import com.hometech.hometech.Repository.OrderRepository;
import com.hometech.hometech.dto.PayOsCreateResponse;
import com.hometech.hometech.enums.PaymentMethod;
import com.hometech.hometech.model.Payment;
import com.hometech.hometech.model.Order;
import com.hometech.hometech.Repository.PaymentRepository;
import com.hometech.hometech.service.PayOsService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/payment/payos")
public class PayOsController {

    private final OrderRepository orderRepository;
    private final PayOsService payOsService;
    private final PaymentRepository paymentRepository;

    @Value("${frontend.base-url:http://localhost:5173}")
    private String frontendBaseUrl;

    public PayOsController(OrderRepository orderRepository,
                           PayOsService payOsService,
                           PaymentRepository paymentRepository) {
        this.orderRepository = orderRepository;
        this.payOsService = payOsService;
        this.paymentRepository = paymentRepository;
    }

    @PostMapping("/create")
    public ResponseEntity<?> createPayment(@RequestParam Long orderId) {
        try {
            Order order = orderRepository.findById(orderId).orElse(null);
            if (order == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of(
                                "success", false,
                                "message", "Không tìm thấy đơn hàng"
                        ));
            }

            if (order.getPaymentMethod() == null || !order.getPaymentMethod().equals(PaymentMethod.PAYOS)) {
                String errorMsg = String.format("Đơn hàng không sử dụng PayOS. PaymentMethod hiện tại: %s (expected: PAYOS)", 
                        order.getPaymentMethod() != null ? order.getPaymentMethod() : "null");
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of(
                                "success", false,
                                "message", errorMsg
                        ));
            }

            PayOsCreateResponse response = payOsService.createPaymentLink(order);

            if (!response.isSuccess()) {
                // Payment đã được cập nhật trong PayOsService, không cần query lại
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of(
                                "success", false,
                                "message", response.getMessage() != null ? response.getMessage() : "Không thể tạo liên kết thanh toán PayOS. Vui lòng thử lại hoặc chọn phương thức thanh toán khác."
                        ));
            }

            Map<String, Object> body = new HashMap<>();
            body.put("success", true);
            body.put("checkoutUrl", response.getCheckoutUrl());
            body.put("orderCode", response.getOrderCode());
            body.put("paymentLinkId", response.getPaymentLinkId());
            body.put("qrCode", response.getQrCode());
            body.put("message", response.getMessage());

            return ResponseEntity.ok(body);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of(
                            "success", false,
                            "message", "Lỗi khi tạo liên kết thanh toán PayOS: " + e.getMessage()
                    ));
        }
    }

    @GetMapping("/result")
    public ResponseEntity<?> handlePaymentResult(
            @RequestParam(required = false) String orderCode,
            @RequestParam(required = false) Boolean success,
            @RequestParam(required = false) String message) {
        // Cập nhật payment trạng thái SUCCESS dựa trên orderCode nếu PayOS đã báo thành công qua redirect
        if (Boolean.TRUE.equals(success) && orderCode != null) {
            paymentRepository.findByTxnRef(orderCode).ifPresent(payment -> {
                payment.setStatus("SUCCESS");
                payment.setTransactionStatus("SUCCESS");
                paymentRepository.save(payment);
            });
        }
        Map<String, Object> result = new HashMap<>();
        result.put("orderCode", orderCode);
        result.put("success", success != null ? success : false);
        result.put("message", message != null ? message : "Kết quả thanh toán");
        return ResponseEntity.ok(result);
    }

    @PostMapping("/webhook")
    public ResponseEntity<?> handleWebhook(@RequestBody com.hometech.hometech.dto.PayOsWebhookPayload payload) {
        try {
            if (payOsService.verifyWebhookSignature(payload)) {
                payOsService.handleWebhook(payload);
                return ResponseEntity.ok(Map.of("success", true));
            } else {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("success", false, "message", "Invalid signature"));
            }
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("success", false, "message", e.getMessage()));
        }
    }
}