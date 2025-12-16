package com.hometech.hometech.controller.Api;

import com.hometech.hometech.Repository.OrderRepository;
import com.hometech.hometech.Repository.PaymentRepository;
import com.hometech.hometech.dto.VnPayCreateResponse;
import com.hometech.hometech.dto.VnPayReturnResponse;
import com.hometech.hometech.enums.PaymentMethod;
import com.hometech.hometech.model.Order;
import com.hometech.hometech.model.Payment;
import com.hometech.hometech.service.VnPayService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.util.HashMap;
import java.util.Map;

@RestController
public class VnPayController {

    private final OrderRepository orderRepository;
    private final PaymentRepository paymentRepository;
    private final VnPayService vnPayService;

    @Value("${frontend.base-url:http://localhost:5173}")
    private String frontendBaseUrl;

    public VnPayController(OrderRepository orderRepository,
                           PaymentRepository paymentRepository,
                           VnPayService vnPayService) {
        this.orderRepository = orderRepository;
        this.paymentRepository = paymentRepository;
        this.vnPayService = vnPayService;
    }

    @PostMapping("/api/payment/vnpay/create")
    public ResponseEntity<?> createVnPayPayment(HttpServletRequest request,
                                                @RequestParam Long orderId) {
        Order order = orderRepository.findById(orderId).orElse(null);
        if (order == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of(
                            "success", false,
                            "message", "Không tìm thấy đơn hàng"
                    ));
        }

        if (order.getPaymentMethod() != PaymentMethod.VNPAY) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of(
                            "success", false,
                            "message", "Đơn hàng không sử dụng phương thức VNPAY"
                    ));
        }

        Payment payment = paymentRepository.findByOrder(order)
                .orElseGet(() -> {
                    Payment newPayment = new Payment();
                    newPayment.setOrder(order);
                    return newPayment;
                });

        String orderInfo = "Thanh toán đơn hàng #" + order.getId();
        long amount = Math.round(order.getTotalAmount());
        VnPayCreateResponse response = vnPayService.createPaymentUrl(request, amount, orderInfo);

        payment.setAmount(order.getTotalAmount());
        payment.setMethod(PaymentMethod.VNPAY.name());
        payment.setStatus("PENDING");
        payment.setOrderInfo(orderInfo);
        payment.setTxnRef(response.getTxnRef());
        payment.setOrder(order);
        paymentRepository.save(payment);
        order.setPayment(payment);
        orderRepository.save(order);

        Map<String, Object> body = new HashMap<>();
        body.put("success", true);
        body.put("paymentUrl", response.getPaymentUrl());
        body.put("txnRef", response.getTxnRef());
        return ResponseEntity.ok(body);
    }

    @GetMapping("/payment/vnpay-return")
    public ResponseEntity<?> handleVnPayReturn(HttpServletRequest request) {
        VnPayReturnResponse vnPayResponse = vnPayService.processReturn(request);
        Payment payment = paymentRepository.findByTxnRef(vnPayResponse.getTxnRef())
                .orElse(null);

        boolean success = false;
        String message = "Giao dịch không hợp lệ";

        if (payment != null) {
            payment.setBankCode(vnPayResponse.getRawParams().getOrDefault("vnp_BankCode", null));
            payment.setCardType(vnPayResponse.getRawParams().getOrDefault("vnp_CardType", null));
            payment.setResponseCode(vnPayResponse.getResponseCode());
            payment.setTransactionNo(vnPayResponse.getRawParams().getOrDefault("vnp_TransactionNo", null));
            payment.setPayDate(vnPayResponse.getRawParams().getOrDefault("vnp_PayDate", null));
            payment.setTransactionStatus(vnPayResponse.getRawParams().getOrDefault("vnp_TransactionStatus", null));
            payment.setSecureHash(vnPayResponse.getRawParams().getOrDefault("vnp_SecureHash", null));

            if (!vnPayResponse.isValidSignature()) {
                payment.setStatus("INVALID_SIGNATURE");
                message = "Chữ ký không hợp lệ";
            } else if ("00".equals(vnPayResponse.getResponseCode())) {
                payment.setStatus("SUCCESS");
                success = true;
                message = "Thanh toán thành công";
            } else {
                payment.setStatus("FAILED");
                message = "Thanh toán thất bại (" + vnPayResponse.getResponseCode() + ")";
            }

            paymentRepository.save(payment);
        }

        Long orderId = payment != null && payment.getOrder() != null ? payment.getOrder().getId() : null;
        Double amount = payment != null ? payment.getAmount() : null;

        UriComponentsBuilder builder = UriComponentsBuilder
                .fromHttpUrl(frontendBaseUrl + "/payment/vnpay/result")
                .queryParam("success", success)
                .queryParam("message", message);

        if (orderId != null) {
            builder.queryParam("orderId", orderId);
        }
        if (amount != null) {
            builder.queryParam("amount", amount);
        }
        builder.queryParam("responseCode", vnPayResponse.getResponseCode());
        builder.queryParam("txnRef", vnPayResponse.getTxnRef());
        if (success) {
            builder.queryParam("redirect", "orders");
        }

        // encode() để Spring tự mã hóa toàn bộ query param (khoảng trắng, tiếng Việt, v.v.)
        String redirectUrl = builder.encode().build().toUriString();

        return ResponseEntity.status(HttpStatus.FOUND)
                .location(URI.create(redirectUrl))
                .build();
    }
}

