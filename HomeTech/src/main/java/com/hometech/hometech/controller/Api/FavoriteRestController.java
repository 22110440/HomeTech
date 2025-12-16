package com.hometech.hometech.controller.Api;

import com.hometech.hometech.model.Favorite;
import com.hometech.hometech.model.Product;
import com.hometech.hometech.service.FavoriteService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/favorites")
public class FavoriteRestController {

    private final FavoriteService favoriteService;

    public FavoriteRestController(FavoriteService favoriteService) {
        this.favoriteService = favoriteService;
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

    @GetMapping("/user/{userId}")
    public ResponseEntity<Map<String, Object>> getFavorites(@PathVariable Long userId) {
        try {
            List<Product> favorites = favoriteService.getFavorites(userId);
            return buildResponse(true, "Lấy danh sách yêu thích thành công", favorites, null, HttpStatus.OK);
        } catch (RuntimeException ex) {
            return buildResponse(false, ex.getMessage(), null, ex.getMessage(), HttpStatus.NOT_FOUND);
        }
    }

    @GetMapping("/user/{userId}/product/{productId}")
    public ResponseEntity<Map<String, Object>> checkFavorite(
            @PathVariable Long userId,
            @PathVariable Long productId
    ) {
        boolean isFavorite = favoriteService.isFavorite(userId, productId);
        Map<String, Object> data = Map.of("isFavorite", isFavorite);
        return buildResponse(true, "Kiểm tra trạng thái yêu thích", data, null, HttpStatus.OK);
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> addFavorite(
            @RequestParam Long userId,
            @RequestParam Long productId
    ) {
        try {
            Favorite favorite = favoriteService.addFavorite(userId, productId);
            Map<String, Object> data = Map.of(
                    "productId", favorite.getProduct().getId(),
                    "favoriteId", favorite.getId()
            );
            return buildResponse(true, "Đã thêm vào danh sách yêu thích", data, null, HttpStatus.OK);
        } catch (RuntimeException ex) {
            return buildResponse(false, ex.getMessage(), null, ex.getMessage(), HttpStatus.BAD_REQUEST);
        }
    }

    @DeleteMapping
    public ResponseEntity<Map<String, Object>> removeFavorite(
            @RequestParam Long userId,
            @RequestParam Long productId
    ) {
        boolean removed = favoriteService.removeFavorite(userId, productId);
        if (!removed) {
            return buildResponse(false, "Sản phẩm chưa nằm trong danh sách yêu thích", null,
                    "Favorite not found", HttpStatus.NOT_FOUND);
        }
        return buildResponse(true, "Đã xóa khỏi danh sách yêu thích", null, null, HttpStatus.OK);
    }
}

