package com.hometech.hometech.controller.Api;

import com.hometech.hometech.dto.PreviewOrderResponse;
import com.hometech.hometech.enums.OrderStatus;
import com.hometech.hometech.enums.PaymentMethod;
import com.hometech.hometech.model.Order;
import com.hometech.hometech.service.OrderService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/orders")
public class OrderRestController {

    private final OrderService orderService;

    public OrderRestController(OrderService orderService) {
        this.orderService = orderService;
    }

    // ==================================================================
    // 🔥 Hàm buildResponse — Y CHANG CartRestController
    // ==================================================================
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

    // ==================================================================
    // 🔥 API
    // ==================================================================
    @GetMapping("/preview")
    public ResponseEntity<?> previewOrder(
            @RequestParam Long userId,
            @RequestParam(required = false) String voucherCode,
            @RequestParam(required = false) Long productId,
            @RequestParam(required = false) Integer quantity
    ) {
        try {
            PreviewOrderResponse preview = orderService.previewOrder(userId, voucherCode, productId, quantity);
            return ResponseEntity.ok(preview);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
    @PostMapping("/create/{userId}")
    public ResponseEntity<Map<String, Object>> createOrder(
            @PathVariable Long userId,
            @RequestParam(required = false) String voucherCode,
            @RequestParam(required = false) PaymentMethod paymentMethod,
            @RequestParam(required = false) Long productId,
            @RequestParam(required = false) Integer quantity
    ) {
        try {
            System.out.println("🔍 OrderRestController.createOrder - paymentMethod received: " + paymentMethod);
            System.out.println("🔍 OrderRestController.createOrder - paymentMethod type: " + (paymentMethod != null ? paymentMethod.getClass().getName() : "null"));
            if (paymentMethod != null) {
                System.out.println("🔍 OrderRestController.createOrder - paymentMethod.name(): " + paymentMethod.name());
            }
            Order order = orderService.createOrder(userId, voucherCode, paymentMethod, productId, quantity);
            System.out.println("🔍 OrderRestController.createOrder - order created with paymentMethod: " + order.getPaymentMethod());
            return buildResponse(true, "Đơn hàng được tạo thành công", order, null, HttpStatus.OK);
        } catch (RuntimeException e) {
            System.err.println("❌ OrderRestController.createOrder error: " + e.getMessage());
            e.printStackTrace();
            return buildResponse(false, "Tạo đơn hàng thất bại", null, e.getMessage(), HttpStatus.BAD_REQUEST);
        }
    }


    @GetMapping("/user/{userId}")
    public ResponseEntity<Map<String, Object>> getOrdersByUserId(@PathVariable Long userId) {
        try {
            List<Order> orders = orderService.getOrdersByUserId(userId);
            return buildResponse(true, "Danh sách đơn hàng của user", orders, null, HttpStatus.OK);
        } catch (RuntimeException e) {
            return buildResponse(false, "Không tìm thấy đơn hàng của user", null, e.getMessage(), HttpStatus.NOT_FOUND);
        }
    }

    @GetMapping("/user/{userId}/status/{status}")
    public ResponseEntity<Map<String, Object>> getOrdersByUserIdAndStatus(
            @PathVariable Long userId,
            @PathVariable OrderStatus status) {
        try {
            List<Order> orders = orderService.getOrdersByUserIdAndStatus(userId, status);
            return buildResponse(true,
                    "Danh sách đơn hàng theo trạng thái: " + status,
                    orders,
                    null,
                    HttpStatus.OK);
        } catch (RuntimeException e) {
            return buildResponse(false, "Không tìm thấy đơn hàng theo trạng thái", null, e.getMessage(), HttpStatus.NOT_FOUND);
        }
    }

    @GetMapping("/admin/all")
    public ResponseEntity<Map<String, Object>> getAllOrders() {
        List<Order> orders = orderService.getAllOrders();
        return buildResponse(true, "Danh sách tất cả đơn hàng (admin)", orders, null, HttpStatus.OK);
    }

    @GetMapping("/admin/status/{status}")
    public ResponseEntity<Map<String, Object>> getOrdersByStatus(@PathVariable OrderStatus status) {
        List<Order> orders = orderService.getOrdersByStatus(status);
        return buildResponse(true, "Danh sách đơn hàng theo trạng thái " + status, orders, null, HttpStatus.OK);
    }

    @GetMapping("/{orderId}")
    public ResponseEntity<Map<String, Object>> getOrderById(@PathVariable int orderId) {
        Order order = orderService.getOrderById(orderId);

        if (order == null) {
            return buildResponse(false,
                    "Không tìm thấy đơn hàng #" + orderId,
                    null,
                    "Order not found",
                    HttpStatus.NOT_FOUND);
        }

        return buildResponse(true, "Chi tiết đơn hàng #" + orderId, order, null, HttpStatus.OK);
    }

    @PutMapping("/{orderId}/status")
    public ResponseEntity<Map<String, Object>> updateOrderStatus(
            @PathVariable int orderId,
            @RequestParam OrderStatus newStatus) {
        try {
            Order order = orderService.updateStatus(orderId, newStatus);
            return buildResponse(true,
                    "Cập nhật trạng thái đơn hàng #" + orderId + " thành " + newStatus,
                    order,
                    null,
                    HttpStatus.OK);
        } catch (RuntimeException e) {
            return buildResponse(false, "Cập nhật trạng thái thất bại", null, e.getMessage(), HttpStatus.BAD_REQUEST);
        }
    }

    @GetMapping("/statuses")
    public ResponseEntity<Map<String, Object>> getAllOrderStatuses() {
        return buildResponse(true, "Danh sách trạng thái đơn hàng", OrderStatus.values(), null, HttpStatus.OK);
    }

    @GetMapping("/{orderId}/can-cancel")
    public ResponseEntity<Map<String, Object>> canCancelOrder(@PathVariable int orderId) {
        boolean canCancel = orderService.canCancelOrder(orderId);
        return buildResponse(true,
                "Kiểm tra khả năng hủy đơn hàng #" + orderId,
                canCancel,
                null,
                HttpStatus.OK);
    }

    @PutMapping("/{orderId}/cancel/user/{userId}")
    public ResponseEntity<Map<String, Object>> cancelOrderByUser(
            @PathVariable int orderId,
            @PathVariable Long userId) {

        try {
            Order order = orderService.cancelOrderByUser(userId, orderId);
            return buildResponse(true,
                    "Hủy đơn hàng #" + orderId + " bởi user",
                    order,
                    null,
                    HttpStatus.OK);
        } catch (RuntimeException e) {
            return buildResponse(false, "Hủy đơn hàng thất bại", null, e.getMessage(), HttpStatus.BAD_REQUEST);
        }
    }

    @PutMapping("/{orderId}/cancel/admin")
    public ResponseEntity<Map<String, Object>> cancelOrderByAdmin(@PathVariable int orderId) {
        try {
            Order order = orderService.cancelOrderByAdmin(orderId);
            return buildResponse(true,
                    "Hủy đơn hàng #" + orderId + " bởi admin",
                    order,
                    null,
                    HttpStatus.OK);
        } catch (RuntimeException e) {
            return buildResponse(false, "Hủy đơn hàng thất bại", null, e.getMessage(), HttpStatus.BAD_REQUEST);
        }
    }

    @GetMapping("/my-expenses")
    public ResponseEntity<Map<String, Object>> getMyExpenses(
            @RequestParam Long userId,
            @RequestParam String startDate,
            @RequestParam String endDate,
            @RequestParam(required = false, defaultValue = "DAY") String groupBy) {
        try {
            Map<String, Object> expenses = orderService.getExpensesByDateRange(userId, startDate, endDate, groupBy);
            return buildResponse(true, "Lấy thống kê chi tiêu thành công", expenses, null, HttpStatus.OK);
        } catch (RuntimeException e) {
            return buildResponse(false, "Không thể lấy thống kê chi tiêu", null, e.getMessage(), HttpStatus.BAD_REQUEST);
        }
    }
}
