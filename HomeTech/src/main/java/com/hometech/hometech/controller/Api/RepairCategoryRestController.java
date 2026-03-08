package com.hometech.hometech.controller.Api;

import com.hometech.hometech.dto.RepairCategoryRequest;
import com.hometech.hometech.model.RepairCategory;
import com.hometech.hometech.service.RepairCategoryService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
public class RepairCategoryRestController {
    private final RepairCategoryService service;

    public RepairCategoryRestController(RepairCategoryService service) {
        this.service = service;
    }

    private ResponseEntity<Map<String, Object>> res(boolean success, String message, Object data, String error, HttpStatus status) {
        Map<String, Object> map = new HashMap<>();
        map.put("success", success);
        map.put("message", message);
        map.put("data", data);
        map.put("error", error);
        return ResponseEntity.status(status).body(map);
    }

    @GetMapping("/api/repair-categories")
    public ResponseEntity<Map<String, Object>> getActive() {
        List<RepairCategory> data = service.getActiveCategories();
        return res(true, "Lấy danh mục sửa chữa thành công", data, null, HttpStatus.OK);
    }

    @GetMapping("/api/admin/repair-categories")
    public ResponseEntity<Map<String, Object>> getAll() {
        List<RepairCategory> data = service.getAllCategories();
        return res(true, "Lấy danh mục sửa chữa (admin) thành công", data, null, HttpStatus.OK);
    }

    @PostMapping("/api/admin/repair-categories")
    public ResponseEntity<Map<String, Object>> create(@RequestBody RepairCategoryRequest request) {
        try {
            RepairCategory created = service.create(request);
            return res(true, "Tạo danh mục sửa chữa thành công", created, null, HttpStatus.OK);
        } catch (RuntimeException e) {
            return res(false, "Tạo danh mục sửa chữa thất bại", null, e.getMessage(), HttpStatus.BAD_REQUEST);
        }
    }

    @PutMapping("/api/admin/repair-categories/{id}")
    public ResponseEntity<Map<String, Object>> update(@PathVariable Long id, @RequestBody RepairCategoryRequest request) {
        try {
            RepairCategory updated = service.update(id, request);
            return res(true, "Cập nhật danh mục sửa chữa thành công", updated, null, HttpStatus.OK);
        } catch (RuntimeException e) {
            return res(false, "Cập nhật danh mục sửa chữa thất bại", null, e.getMessage(), HttpStatus.BAD_REQUEST);
        }
    }

    @DeleteMapping("/api/admin/repair-categories/{id}")
    public ResponseEntity<Map<String, Object>> delete(@PathVariable Long id) {
        try {
            service.delete(id);
            return res(true, "Xóa danh mục sửa chữa thành công", null, null, HttpStatus.OK);
        } catch (RuntimeException e) {
            return res(false, "Xóa danh mục sửa chữa thất bại", null, e.getMessage(), HttpStatus.BAD_REQUEST);
        }
    }
}
