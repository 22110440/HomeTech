package com.hometech.hometech.controller.Api;

import com.hometech.hometech.dto.RepairSimpleCategoryRequest;
import com.hometech.hometech.model.RepairServiceCategory;
import com.hometech.hometech.service.RepairServiceCategoryService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
public class RepairServiceCategoryRestController {

    private final RepairServiceCategoryService service;

    public RepairServiceCategoryRestController(RepairServiceCategoryService service) {
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

    @GetMapping("/api/repair-service-categories")
    public ResponseEntity<Map<String, Object>> getActive() {
        List<RepairServiceCategory> data = service.getActive();
        return res(true, "Lấy danh mục sửa chữa thành công", data, null, HttpStatus.OK);
    }

    @GetMapping("/api/admin/repair-service-categories")
    public ResponseEntity<Map<String, Object>> getAll() {
        List<RepairServiceCategory> data = service.getAll();
        return res(true, "Lấy danh mục sửa chữa (admin) thành công", data, null, HttpStatus.OK);
    }

    @PostMapping("/api/admin/repair-service-categories")
    public ResponseEntity<Map<String, Object>> create(@RequestBody RepairSimpleCategoryRequest request) {
        try {
            return res(true, "Tạo danh mục sửa chữa thành công", service.create(request), null, HttpStatus.OK);
        } catch (RuntimeException e) {
            return res(false, "Tạo danh mục sửa chữa thất bại", null, e.getMessage(), HttpStatus.BAD_REQUEST);
        }
    }

    @PutMapping("/api/admin/repair-service-categories/{id}")
    public ResponseEntity<Map<String, Object>> update(@PathVariable Long id, @RequestBody RepairSimpleCategoryRequest request) {
        try {
            return res(true, "Cập nhật danh mục sửa chữa thành công", service.update(id, request), null, HttpStatus.OK);
        } catch (RuntimeException e) {
            return res(false, "Cập nhật danh mục sửa chữa thất bại", null, e.getMessage(), HttpStatus.BAD_REQUEST);
        }
    }

    @DeleteMapping("/api/admin/repair-service-categories/{id}")
    public ResponseEntity<Map<String, Object>> delete(@PathVariable Long id) {
        try {
            service.delete(id);
            return res(true, "Xóa danh mục sửa chữa thành công", null, null, HttpStatus.OK);
        } catch (RuntimeException e) {
            return res(false, "Xóa danh mục sửa chữa thất bại", null, e.getMessage(), HttpStatus.BAD_REQUEST);
        }
    }
}
