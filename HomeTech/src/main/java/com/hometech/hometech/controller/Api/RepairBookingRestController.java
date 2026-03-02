package com.hometech.hometech.controller.Api;

import com.hometech.hometech.dto.PayOsCreateResponse;
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
import org.springframework.web.bind.annotation.*;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
public class RepairBookingRestController {

    private final RepairBookingService repairBookingService;
    private final VnPayService vnPayService;
    private final PayOsService payOsService;

    @Value("${frontend.base-url:http://localhost:5173}")
    private String frontendBaseUrl;

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

    @PostMapping("/api/repair-bookings")
    public ResponseEntity<Map<String, Object>> createRepairBooking(@RequestBody RepairBookingRequest request) {
        try {
            RepairBooking booking = repairBookingService.createBooking(request);
            return buildResponse(true, "Đặt lịch sửa chữa thành công", booking, null, HttpStatus.OK);
        } catch (RuntimeException e) {
            return buildResponse(false, "Đặt lịch sửa chữa thất bại", null, e.getMessage(), HttpStatus.BAD_REQUEST);
        }
    }

    @GetMapping("/api/repair-bookings/history/{customerId}")
    public ResponseEntity<Map<String, Object>> getHistory(@PathVariable Long customerId) {
        List<RepairBooking> history = repairBookingService.getBookingHistory(customerId);
        return buildResponse(true, "Lấy lịch sử sửa chữa thành công", history, null, HttpStatus.OK);
    }

    @PostMapping("/api/repair-bookings/{bookingId}/payment/vnpay")
    public ResponseEntity<?> createRepairVnPay(HttpServletRequest request, @PathVariable Long bookingId) {
        try {
            RepairBooking booking = repairBookingService.getBookingById(bookingId);
            if (booking.getPaymentMethod() != PaymentMethod.VNPAY) {
                return buildResponse(false, "Lịch sửa chữa không dùng VNPAY", null, null, HttpStatus.BAD_REQUEST);
            }
            String orderInfo = "Thanh toan sua chua #" + booking.getId();
            VnPayCreateResponse response = vnPayService.createPaymentUrl(request, Math.round(booking.getTotalAmount()), orderInfo);
            booking.setPaymentTxnRef(response.getTxnRef());
            booking.setPaymentCheckoutUrl(response.getPaymentUrl());
            repairBookingService.save(booking);
            return ResponseEntity.ok(Map.of("success", true, "paymentUrl", response.getPaymentUrl(), "txnRef", response.getTxnRef()));
        } catch (RuntimeException e) {
            return buildResponse(false, "Không thể tạo thanh toán VNPAY", null, e.getMessage(), HttpStatus.BAD_REQUEST);
        }
    }

    @PostMapping("/api/repair-bookings/{bookingId}/payment/payos")
    public ResponseEntity<?> createRepairPayOs(@PathVariable Long bookingId) {
        try {
            RepairBooking booking = repairBookingService.getBookingById(bookingId);
            if (booking.getPaymentMethod() != PaymentMethod.PAYOS) {
                return buildResponse(false, "Lịch sửa chữa không dùng PAYOS", null, null, HttpStatus.BAD_REQUEST);
            }

            long orderCode = (booking.getId() * 100000) + (System.currentTimeMillis() % 100000);
            String returnUrl = frontendBaseUrl.replace("5173", "8080") + "/payment/repair/payos/callback?bookingId=" + booking.getId();
            String cancelUrl = frontendBaseUrl.replace("5173", "8080") + "/payment/repair/payos/cancel?bookingId=" + booking.getId();
            PayOsCreateResponse response = payOsService.createPaymentLinkForRepair(orderCode, Math.round(booking.getTotalAmount()), "Repair " + booking.getId(), returnUrl, cancelUrl);

            booking.setPaymentTxnRef(response.getOrderCode());
            booking.setPaymentCheckoutUrl(response.getCheckoutUrl());
            repairBookingService.save(booking);
            return ResponseEntity.ok(Map.of("success", true, "checkoutUrl", response.getCheckoutUrl(), "orderCode", response.getOrderCode()));
        } catch (RuntimeException e) {
            return buildResponse(false, "Không thể tạo thanh toán PayOS", null, e.getMessage(), HttpStatus.BAD_REQUEST);
        }
    }

    @GetMapping("/payment/repair/vnpay-return")
    public ResponseEntity<Void> handleRepairVnPayReturn(HttpServletRequest request) {
        VnPayReturnResponse vnPayResponse = vnPayService.processReturn(request);
        boolean success = vnPayResponse.isValidSignature() && "00".equals(vnPayResponse.getResponseCode());

        if (success && vnPayResponse.getTxnRef() != null) {
            try {
                repairBookingService.markPaidByTxnRef(vnPayResponse.getTxnRef(), null);
            } catch (RuntimeException ignored) {}
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
            } catch (RuntimeException ignored) {}
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
