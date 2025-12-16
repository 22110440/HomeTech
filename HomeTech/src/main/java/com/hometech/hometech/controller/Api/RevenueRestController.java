package com.hometech.hometech.controller.Api;

import com.hometech.hometech.service.RevenueService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/revenue")
@PreAuthorize("hasRole('ADMIN')")
public class RevenueRestController {

    private final RevenueService revenueService;

    public RevenueRestController(RevenueService revenueService) {
        this.revenueService = revenueService;
    }

    // ---- TEMPLATE RESPONSE ----
    private ResponseEntity<Map<String, Object>> buildResponse(
            boolean success, String message, Object data, String error, HttpStatus status) {

        Map<String, Object> res = new HashMap<>();
        res.put("status", status.value());
        res.put("success", success);
        res.put("message", message);
        res.put("data", data);
        res.put("error", error);
        return ResponseEntity.status(status).body(res);
    }

    /**
     * Get revenue statistics
     * @param startDate Start date (default: today)
     * @param endDate End date (default: today)
     * @param groupBy Grouping: DAY, WEEK, MONTH, QUARTER, YEAR (default: DAY)
     * @param categoryId Optional category filter
     * @param productId Optional product filter
     */
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getRevenueStats(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(defaultValue = "DAY") String groupBy,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) Long productId
    ) {
        try {
            // Default to today if not specified
            if (startDate == null) {
                startDate = LocalDate.now();
            }
            if (endDate == null) {
                endDate = LocalDate.now();
            }

            // Validate date range
            if (startDate.isAfter(endDate)) {
                return buildResponse(false, "Ngày bắt đầu phải trước ngày kết thúc", null,
                        "Invalid date range", HttpStatus.BAD_REQUEST);
            }

            // Validate groupBy
            String groupByUpper = groupBy.toUpperCase();
            if (!List.of("DAY", "WEEK", "MONTH", "QUARTER", "YEAR").contains(groupByUpper)) {
                return buildResponse(false, "GroupBy không hợp lệ", null,
                        "Invalid groupBy parameter", HttpStatus.BAD_REQUEST);
            }

            Map<String, Object> stats = revenueService.getRevenueStats(
                    startDate, endDate, groupByUpper, categoryId, productId
            );

            return buildResponse(true, "Lấy thống kê doanh thu thành công", stats, null, HttpStatus.OK);

        } catch (Exception e) {
            e.printStackTrace();
            return buildResponse(false, "Có lỗi khi lấy thống kê doanh thu", null,
                    e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Get top 5 products by revenue
     * @param startDate Start date (default: today)
     * @param endDate End date (default: today)
     * @param categoryId Optional category filter
     */
    @GetMapping("/top-products")
    public ResponseEntity<Map<String, Object>> getTopProducts(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) Long categoryId
    ) {
        try {
            // Default to today if not specified
            if (startDate == null) {
                startDate = LocalDate.now();
            }
            if (endDate == null) {
                endDate = LocalDate.now();
            }

            // Validate date range
            if (startDate.isAfter(endDate)) {
                return buildResponse(false, "Ngày bắt đầu phải trước ngày kết thúc", null,
                        "Invalid date range", HttpStatus.BAD_REQUEST);
            }

            List<Map<String, Object>> topProducts = revenueService.getTopProducts(
                    startDate, endDate, categoryId
            );

            return buildResponse(true, "Lấy top sản phẩm thành công", topProducts, null, HttpStatus.OK);

        } catch (Exception e) {
            e.printStackTrace();
            return buildResponse(false, "Có lỗi khi lấy top sản phẩm", null,
                    e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
