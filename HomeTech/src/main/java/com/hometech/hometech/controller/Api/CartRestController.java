package com.hometech.hometech.controller.Api;

import com.hometech.hometech.dto.CartItemDTO;
import com.hometech.hometech.model.CartItem;
import com.hometech.hometech.service.CartService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/cart")
public class CartRestController {

    private final CartService service;

    public CartRestController(CartService service) {
        this.service = service;
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

    // 🟢 Xem toàn bộ giỏ hàng (deprecated - chỉ dành cho admin)
    @GetMapping
    public ResponseEntity<Map<String, Object>> getAll() {
        List<CartItem> items = service.getAllItems();
        return buildResponse(true, "Lấy toàn bộ giỏ hàng thành công", items, null, HttpStatus.OK);
    }

    // 🟢 Xem giỏ hàng của user cụ thể
    @GetMapping("/user/{userId}")
    public ResponseEntity<Map<String, Object>> getCartByUserId(@PathVariable Long userId) {
        List<CartItem> items = service.getCartItemsByUserId(userId);
        // Convert to DTO to include product information
        List<CartItemDTO> itemDTOs = items.stream()
                .map(CartItemDTO::new)
                .collect(Collectors.toList());
        return buildResponse(true, "Lấy giỏ hàng của user thành công", itemDTOs, null, HttpStatus.OK);
    }

    // 🟢 Thêm sản phẩm vào giỏ
    @PostMapping("/add")
    public ResponseEntity<Map<String, Object>> addToCart(
            @RequestParam Long userId,
            @RequestParam int productId,
            @RequestParam(defaultValue = "1") int quantity,
            @RequestParam(required = false) Long variantId) {
        try {
            CartItem added = service.addProduct(userId, productId, quantity, variantId);
            return buildResponse(true, "Thêm sản phẩm vào giỏ thành công", added, null, HttpStatus.OK);
        } catch (RuntimeException e) {
            return buildResponse(false, e.getMessage(), null, e.getMessage(), HttpStatus.BAD_REQUEST);
        }
    }

    // 🟢 Tăng số lượng
    @PutMapping("/increase/{userId}/{id}")
    public ResponseEntity<Map<String, Object>> increase(@PathVariable Long userId, @PathVariable Long id) {
        CartItem updated = service.increaseQuantity(userId, id);
        if (updated == null) {
            return buildResponse(false, "Không tìm thấy item", null, "Item not found", HttpStatus.NOT_FOUND);
        }
        // Convert to DTO to include product information
        CartItemDTO dto = new CartItemDTO(updated);
        return buildResponse(true, "Tăng số lượng thành công", dto, null, HttpStatus.OK);
    }

    // 🟢 Giảm số lượng
    @PutMapping("/decrease/{userId}/{id}")
    public ResponseEntity<Map<String, Object>> decrease(@PathVariable Long userId, @PathVariable Long id) {
        CartItem updated = service.decreaseQuantity(userId, id);
        if (updated == null) {
            return buildResponse(false, "Không tìm thấy item", null, "Item not found", HttpStatus.NOT_FOUND);
        }
        // Convert to DTO to include product information
        CartItemDTO dto = new CartItemDTO(updated);
        return buildResponse(true, "Giảm số lượng thành công", dto, null, HttpStatus.OK);
    }

    @DeleteMapping("/remove/{userId}/{id}")
    public ResponseEntity<Map<String, Object>> remove(@PathVariable Long userId, @PathVariable Long id) {

        service.removeItem(userId, id);

        return buildResponse(
                true,
                "Xóa sản phẩm thành công",
                null,
                null,
                HttpStatus.OK
        );
    }

}
