package com.hometech.hometech.controller.Api;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hometech.hometech.dto.PayOsCreateResponse;
import com.hometech.hometech.dto.RepairBookingPaymentMethodRequest;
import com.hometech.hometech.dto.RepairBookingProgressRequest;
import com.hometech.hometech.dto.RepairBookingRequest;
import com.hometech.hometech.dto.VnPayCreateResponse;
import com.hometech.hometech.dto.VnPayReturnResponse;
import com.hometech.hometech.enums.PaymentMethod;
import com.hometech.hometech.model.RepairBooking;
import com.hometech.hometech.service.PayOsService;
import com.hometech.hometech.service.RepairBookingService;
import com.hometech.hometech.service.VnPayService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
import java.net.URI;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
public class RepairBookingRestController {

    private final RepairBookingService repairBookingService;
    private final VnPayService vnPayService;
    private final PayOsService payOsService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${frontend.base-url:http://localhost:5173}")
    private String frontendBaseUrl;

    @Value("${backend.base-url:http://localhost:8080}")
    private String backendBaseUrl;

    public RepairBookingRestController(RepairBookingService repairBookingService,
                                       VnPayService vnPayService,
                                       PayOsService payOsService) {
        this.repairBookingService = repairBookingService;
        this.vnPayService = vnPayService;
        this.payOsService = payOsService;
    }

    private ResponseEntity<Map<String, Object>> buildResponse(boolean success, String message, Object data, String error, HttpStatus status) {
        Map<String, Object> res = new HashMap<>();
        res.put("success", success);
        res.put("message", message);
        res.put("data", data);
        res.put("error", error);
        return ResponseEntity.status(status).body(res);
    }

    private String normalizeLegacyText(String value) {
        if (value == null || value.isBlank()) {
            return value;
        }

        return switch (value.trim()) {
            case "Th? ?? nh?n s?a ch?a" -> "Thợ đã nhận sửa chữa";
            case "Th? ?? nh?n m?y ?? ki?m tra v? b?o gi? c? th?" -> "Thợ đã nhận máy để kiểm tra và báo giá cụ thể";
            case "?? nh?n ti?n m?t t? kh?ch h?ng" -> "Đã nhận tiền mặt từ khách hàng";
            case "?a s?a xong - ch? x?c nh?n ?? nh?n ti?n m?t" -> "Đã sửa xong - chờ xác nhận đã nhận tiền mặt";
            default -> value;
        };
    }

    private List<String> readImageList(String value) {
        if (value == null || value.isBlank()) {
            return List.of();
        }
        String trimmed = value.trim();
        if (trimmed.startsWith("[")) {
            try {
                return objectMapper.readValue(trimmed, new TypeReference<List<String>>() {});
            } catch (IOException ignored) {
            }
        }
        return Arrays.stream(value.split("\\n"))
                .filter(item -> item != null && !item.isBlank())
                .toList();
    }

    private <T> T readJsonOrDefault(String value, TypeReference<T> typeReference, T defaultValue) {
        if (value == null || value.isBlank()) {
            return defaultValue;
        }
        try {
            return objectMapper.readValue(value, typeReference);
        } catch (IOException ex) {
            return defaultValue;
        }
    }

    private Map<String, Object> toBookingPayload(RepairBooking booking) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("id", booking.getId());
        payload.put("customerId", booking.getCustomer() != null ? booking.getCustomer().getId() : null);
        payload.put("customerName", booking.getCustomerName());
        payload.put("phone", booking.getPhone());
        payload.put("deviceModel", booking.getDeviceModel());
        payload.put("appointmentDate", booking.getAppointmentDate());
        payload.put("appointmentTime", booking.getAppointmentTime());
        payload.put("note", booking.getNote());
        payload.put("bookingType", booking.getBookingType());
        payload.put("paymentMethod", booking.getPaymentMethod());
        payload.put("status", booking.getStatus());
        payload.put("totalAmount", booking.getTotalAmount());
        payload.put("estimatedTradeInAmount", booking.getEstimatedTradeInAmount());
        payload.put("finalTradeInAmount", booking.getFinalTradeInAmount());
        payload.put("tradeInHealthScore", booking.getTradeInHealthScore());
        payload.put("tradeInOfferRangeMin", booking.getTradeInOfferRangeMin());
        payload.put("tradeInOfferRangeMax", booking.getTradeInOfferRangeMax());
        payload.put("tradeInConditionName", booking.getTradeInConditionName());
        payload.put("tradeInConditionDescription", booking.getTradeInConditionDescription());
        payload.put("tradeInBatteryHealth", booking.getTradeInBatteryHealth());
        payload.put("tradeInFunctionalStatus", booking.getTradeInFunctionalStatus());
        payload.put("tradeInVisualStatus", booking.getTradeInVisualStatus());
        payload.put("tradeInInspectionImages", readImageList(booking.getTradeInInspectionImagesJson()));
        payload.put("tradeInAiImageResults", readJsonOrDefault(
                booking.getTradeInAiImageResultsJson(),
                new TypeReference<List<Map<String, Object>>>() {},
                List.of()
        ));
        payload.put("tradeInVideoAnalysis", readJsonOrDefault(
                booking.getTradeInVideoAnalysisJson(),
                new TypeReference<Map<String, Object>>() {},
                Map.of()
        ));
        payload.put("tradeInVideoDataUrl", booking.getTradeInVideoDataUrl());
        payload.put("createdAt", booking.getCreatedAt());
        payload.put("updatedAt", booking.getUpdatedAt());
        payload.put("technicianName", booking.getTechnicianName());
        payload.put("progressNote", normalizeLegacyText(booking.getProgressNote()));
        payload.put("startedAt", booking.getStartedAt());
        payload.put("completedAt", booking.getCompletedAt());
        if (booking.getRepairServicePackage() != null) {
            payload.put("repairPackage", Map.of(
                    "id", booking.getRepairServicePackage().getId(),
                    "serviceName", booking.getRepairServicePackage().getServiceName(),
                    "phoneType", booking.getRepairServicePackage().getPhoneType(),
                    "serviceCategory", booking.getRepairServicePackage().getServiceCategory(),
                    "price", booking.getRepairServicePackage().getPrice()
            ));
        } else {
            payload.put("repairPackage", null);
        }
        return payload;
    }

    @PostMapping("/api/repair-bookings")
    public ResponseEntity<Map<String, Object>> createRepairBooking(@RequestBody RepairBookingRequest request) {
        try {
            RepairBooking booking = repairBookingService.createBooking(request);
            return buildResponse(true, "Dat lich thanh cong", toBookingPayload(booking), null, HttpStatus.OK);
        } catch (RuntimeException e) {
            return buildResponse(false, "Dat lich that bai", null, e.getMessage(), HttpStatus.BAD_REQUEST);
        }
    }

    @PutMapping("/api/repair-bookings/{bookingId}/payment-method")
    public ResponseEntity<Map<String, Object>> updatePaymentMethod(@PathVariable Long bookingId,
                                                                   @RequestBody RepairBookingPaymentMethodRequest request) {
        try {
            RepairBooking booking = repairBookingService.updatePaymentMethod(bookingId, request.getPaymentMethod());
            return buildResponse(true, "Cap nhat phuong thuc thanh toan thanh cong", toBookingPayload(booking), null, HttpStatus.OK);
        } catch (RuntimeException e) {
            return buildResponse(false, "Cap nhat phuong thuc thanh toan that bai", null, e.getMessage(), HttpStatus.BAD_REQUEST);
        }
    }

    @GetMapping("/api/repair-bookings/history/{customerId}")
    public ResponseEntity<Map<String, Object>> getHistory(@PathVariable Long customerId) {
        List<Map<String, Object>> history = repairBookingService.getBookingHistory(customerId).stream().map(this::toBookingPayload).toList();
        return buildResponse(true, "Lay lich su lich hen thanh cong", history, null, HttpStatus.OK);
    }

    @GetMapping("/api/admin/repair-bookings")
    public ResponseEntity<Map<String, Object>> getAllBookingsForAdmin() {
        List<Map<String, Object>> data = repairBookingService.getAllBookingsForAdmin().stream().map(this::toBookingPayload).toList();
        return buildResponse(true, "Lay danh sach lich hen thanh cong", data, null, HttpStatus.OK);
    }

    @PostMapping("/api/admin/repair-bookings")
    public ResponseEntity<Map<String, Object>> createBookingByAdmin(@RequestBody RepairBookingRequest request) {
        try {
            RepairBooking booking = repairBookingService.createBookingByAdmin(request);
            return buildResponse(true, "Them lich hen thanh cong", toBookingPayload(booking), null, HttpStatus.OK);
        } catch (RuntimeException e) {
            return buildResponse(false, "Them lich hen that bai", null, e.getMessage(), HttpStatus.BAD_REQUEST);
        }
    }

    @PutMapping("/api/admin/repair-bookings/{bookingId}")
    public ResponseEntity<Map<String, Object>> updateBookingByAdmin(@PathVariable Long bookingId,
                                                                    @RequestBody RepairBookingRequest request) {
        try {
            RepairBooking booking = repairBookingService.updateBookingByAdmin(bookingId, request);
            return buildResponse(true, "Cap nhat lich hen thanh cong", toBookingPayload(booking), null, HttpStatus.OK);
        } catch (RuntimeException e) {
            return buildResponse(false, "Cap nhat lich hen that bai", null, e.getMessage(), HttpStatus.BAD_REQUEST);
        }
    }

    @PutMapping("/api/admin/repair-bookings/{bookingId}/progress")
    public ResponseEntity<Map<String, Object>> updateProgress(@PathVariable Long bookingId,
                                                              @RequestBody RepairBookingProgressRequest request,
                                                              Authentication authentication) {
        try {
            String username = authentication != null ? authentication.getName() : null;
            RepairBooking updated = repairBookingService.updateProgress(bookingId, request, username);
            return buildResponse(true, "Cap nhat tien trinh thanh cong", toBookingPayload(updated), null, HttpStatus.OK);
        } catch (RuntimeException e) {
            return buildResponse(false, "Cap nhat tien trinh that bai", null, e.getMessage(), HttpStatus.BAD_REQUEST);
        }
    }

    @DeleteMapping("/api/admin/repair-bookings/{bookingId}")
    public ResponseEntity<Map<String, Object>> deleteBookingByAdmin(@PathVariable Long bookingId) {
        try {
            repairBookingService.deleteBookingByAdmin(bookingId);
            return buildResponse(true, "Xoa lich hen thanh cong", null, null, HttpStatus.OK);
        } catch (RuntimeException e) {
            return buildResponse(false, "Xoa lich hen that bai", null, e.getMessage(), HttpStatus.BAD_REQUEST);
        }
    }

    @PostMapping("/api/repair-bookings/{bookingId}/payment/vnpay")
    public ResponseEntity<?> createRepairVnPay(HttpServletRequest request, @PathVariable Long bookingId) {
        try {
            RepairBooking booking = repairBookingService.getBookingById(bookingId);
            if (booking.getPaymentMethod() != PaymentMethod.VNPAY) {
                return buildResponse(false, "Lich sua chua khong dung VNPAY", null, null, HttpStatus.BAD_REQUEST);
            }
            String orderInfo = "Thanh toan sua chua #" + booking.getId();
            String repairReturnUrl = backendBaseUrl + "/payment/repair/vnpay-return";
            VnPayCreateResponse response = vnPayService.createPaymentUrl(request, Math.round(booking.getTotalAmount()), orderInfo, repairReturnUrl);
            booking.setPaymentTxnRef(response.getTxnRef());
            booking.setPaymentCheckoutUrl(response.getPaymentUrl());
            repairBookingService.save(booking);
            return ResponseEntity.ok(Map.of("success", true, "paymentUrl", response.getPaymentUrl(), "txnRef", response.getTxnRef()));
        } catch (RuntimeException e) {
            return buildResponse(false, "Khong the tao thanh toan VNPAY", null, e.getMessage(), HttpStatus.BAD_REQUEST);
        }
    }

    @PostMapping("/api/repair-bookings/{bookingId}/payment/payos")
    public ResponseEntity<?> createRepairPayOs(@PathVariable Long bookingId) {
        try {
            RepairBooking booking = repairBookingService.getBookingById(bookingId);
            if (booking.getPaymentMethod() != PaymentMethod.PAYOS) {
                return buildResponse(false, "Lich sua chua khong dung PAYOS", null, null, HttpStatus.BAD_REQUEST);
            }

            long orderCode = (booking.getId() * 100000) + (System.currentTimeMillis() % 100000);
            String returnUrl = backendBaseUrl + "/payment/repair/payos/callback?bookingId=" + booking.getId();
            String cancelUrl = backendBaseUrl + "/payment/repair/payos/cancel?bookingId=" + booking.getId();
            PayOsCreateResponse response = payOsService.createPaymentLinkForRepair(orderCode, Math.round(booking.getTotalAmount()), "Repair " + booking.getId(), returnUrl, cancelUrl);

            booking.setPaymentTxnRef(response.getOrderCode());
            booking.setPaymentCheckoutUrl(response.getCheckoutUrl());
            repairBookingService.save(booking);
            return ResponseEntity.ok(Map.of("success", true, "checkoutUrl", response.getCheckoutUrl(), "orderCode", response.getOrderCode()));
        } catch (RuntimeException e) {
            return buildResponse(false, "Khong the tao thanh toan PayOS", null, e.getMessage(), HttpStatus.BAD_REQUEST);
        }
    }

    @GetMapping("/payment/repair/vnpay-return")
    public ResponseEntity<Void> handleRepairVnPayReturn(HttpServletRequest request) {
        VnPayReturnResponse vnPayResponse = vnPayService.processReturn(request);
        boolean success = vnPayResponse.isValidSignature() && "00".equals(vnPayResponse.getResponseCode());

        if (success && vnPayResponse.getTxnRef() != null) {
            try {
                repairBookingService.markPaidByTxnRef(vnPayResponse.getTxnRef(), null);
            } catch (RuntimeException ignored) {
            }
        }

        String redirectUrl = UriComponentsBuilder
                .fromHttpUrl(frontendBaseUrl + "/payment/vnpay/result")
                .queryParam("source", "repair")
                .queryParam("txnRef", vnPayResponse.getTxnRef())
                .queryParam("success", success)
                .queryParam("responseCode", vnPayResponse.getResponseCode())
                .build()
                .toUriString();

        HttpHeaders headers = new HttpHeaders();
        headers.setLocation(URI.create(redirectUrl));
        return new ResponseEntity<>(headers, HttpStatus.FOUND);
    }

    @GetMapping("/payment/repair/payos/callback")
    public ResponseEntity<Void> handleRepairPayOsCallback(@RequestParam Long bookingId,
                                                          @RequestParam(required = false) String status,
                                                          @RequestParam(required = false) String orderCode) {
        boolean success = status != null && ("PAID".equalsIgnoreCase(status) || "SUCCESS".equalsIgnoreCase(status));
        if (success && orderCode != null) {
            try {
                repairBookingService.markPaidByTxnRef(orderCode, null);
            } catch (RuntimeException ignored) {
            }
        }

        String redirectUrl = UriComponentsBuilder
                .fromHttpUrl(frontendBaseUrl + "/payment/payos/result")
                .queryParam("source", "repair")
                .queryParam("bookingId", bookingId)
                .queryParam("orderCode", orderCode)
                .queryParam("success", success)
                .queryParam("status", status)
                .build()
                .toUriString();

        HttpHeaders headers = new HttpHeaders();
        headers.setLocation(URI.create(redirectUrl));
        return new ResponseEntity<>(headers, HttpStatus.FOUND);
    }

    @GetMapping("/payment/repair/payos/cancel")
    public ResponseEntity<Void> handleRepairPayOsCancel(@RequestParam Long bookingId) {
        String redirectUrl = UriComponentsBuilder
                .fromHttpUrl(frontendBaseUrl + "/payment/payos/result")
                .queryParam("source", "repair")
                .queryParam("bookingId", bookingId)
                .queryParam("success", false)
                .queryParam("status", "CANCELLED")
                .build()
                .toUriString();
        HttpHeaders headers = new HttpHeaders();
        headers.setLocation(URI.create(redirectUrl));
        return new ResponseEntity<>(headers, HttpStatus.FOUND);
    }
}
