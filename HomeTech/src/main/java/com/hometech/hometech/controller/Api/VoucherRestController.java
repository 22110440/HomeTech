package com.hometech.hometech.controller.Api;

import com.hometech.hometech.model.Voucher;
import com.hometech.hometech.service.VoucherService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/vouchers")
public class VoucherRestController {

    private final VoucherService voucherService;

    public VoucherRestController(VoucherService voucherService) {
        this.voucherService = voucherService;
    }

    private ResponseEntity<Map<String, Object>> buildResponse(
            boolean success,
            String message,
            Object data,
            String error,
            HttpStatus status
    ) {
        Map<String, Object> res = new HashMap<>();
        res.put("success", success);
        res.put("message", message);
        res.put("data", data);
        res.put("error", error);
        return ResponseEntity.status(status).body(res);
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> getAll() {
        List<Voucher> vouchers = voucherService.getAll();
        return buildResponse(true, "Danh sách voucher", vouchers, null, HttpStatus.OK);
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> create(@RequestBody Voucher voucher) {
        try {
            validateVoucherPayload(voucher);
            Voucher saved = voucherService.create(voucher);
            return buildResponse(true, "Tạo voucher thành công", saved, null, HttpStatus.OK);
        } catch (RuntimeException e) {
            return buildResponse(false, "Tạo voucher thất bại", null, e.getMessage(), HttpStatus.BAD_REQUEST);
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> update(@PathVariable Long id, @RequestBody Voucher voucher) {
        try {
            validateVoucherPayload(voucher);
            Voucher updated = voucherService.update(id, voucher);
            return buildResponse(true, "Cập nhật voucher thành công", updated, null, HttpStatus.OK);
        } catch (RuntimeException e) {
            return buildResponse(false, "Cập nhật voucher thất bại", null, e.getMessage(), HttpStatus.BAD_REQUEST);
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> delete(@PathVariable Long id) {
        try {
            voucherService.delete(id);
            return buildResponse(true, "Xóa voucher thành công", null, null, HttpStatus.OK);
        } catch (RuntimeException e) {
            return buildResponse(false, "Xóa voucher thất bại", null, e.getMessage(), HttpStatus.BAD_REQUEST);
        }
    }

    private void validateVoucherPayload(Voucher voucher) {
        if (voucher.getCode() == null || voucher.getCode().isBlank()) {
            throw new RuntimeException("Mã voucher không được để trống");
        }

        if ((voucher.getDiscountPercent() == null || voucher.getDiscountPercent() <= 0)
                && (voucher.getDiscountAmount() == null || voucher.getDiscountAmount() <= 0)) {
            throw new RuntimeException("Phải nhập giảm theo % hoặc theo số tiền");
        }

        LocalDateTime start = voucher.getStartDate();
        LocalDateTime end = voucher.getEndDate();
        if (start == null || end == null) {
            throw new RuntimeException("Thời gian bắt đầu/kết thúc không hợp lệ");
        }
        if (end.isBefore(start)) {
            throw new RuntimeException("Ngày kết thúc phải sau ngày bắt đầu");
        }

        if (voucher.getUsageLimit() == null || voucher.getUsageLimit() <= 0) {
            throw new RuntimeException("Số lượt sử dụng phải lớn hơn 0");
        }

        if (voucher.getMinOrderValue() == null || voucher.getMinOrderValue() < 0) {
            voucher.setMinOrderValue(0.0);
        }

        if (voucher.getUsedCount() == null || voucher.getUsedCount() < 0) {
            voucher.setUsedCount(0);
        }
    }
}

