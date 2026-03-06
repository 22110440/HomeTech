package com.hometech.hometech.controller.Api;

import com.hometech.hometech.dto.RepairSimpleCategoryRequest;
import com.hometech.hometech.model.RepairPhoneCategory;
import com.hometech.hometech.service.RepairPhoneCategoryService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
public class RepairPhoneCategoryRestController {

    private final RepairPhoneCategoryService service;

    public RepairPhoneCategoryRestController(RepairPhoneCategoryService service) {
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

    @GetMapping("/api/repair-phone-categories")
    public ResponseEntity<Map<String, Object>> getActive() {
        List<RepairPhoneCategory> data = service.getActive();
        return res(true, "Lấy danh mục điện thoại thành công", data, null, HttpStatus.OK);
    }

    @GetMapping("/api/admin/repair-phone-categories")
    public ResponseEntity<Map<String, Object>> getAll() {
        List<RepairPhoneCategory> data = service.getAll();
        return res(true, "Lấy danh mục điện thoại (admin) thành công", data, null, HttpStatus.OK);
    }

    @PostMapping("/api/admin/repair-phone-categories")
    public ResponseEntity<Map<String, Object>> create(@RequestBody RepairSimpleCategoryRequest request) {
        try {
            return res(true, "Tạo danh mục điện thoại thành công", service.create(request), null, HttpStatus.OK);
        } catch (RuntimeException e) {
            return res(false, "Tạo danh mục điện thoại thất bại", null, e.getMessage(), HttpStatus.BAD_REQUEST);
        }
    }

    @PutMapping("/api/admin/repair-phone-categories/{id}")
    public ResponseEntity<Map<String, Object>> update(@PathVariable Long id, @RequestBody RepairSimpleCategoryRequest request) {
        try {
            return res(true, "Cập nhật danh mục điện thoại thành công", service.update(id, request), null, HttpStatus.OK);
        } catch (RuntimeException e) {
            return res(false, "Cập nhật danh mục điện thoại thất bại", null, e.getMessage(), HttpStatus.BAD_REQUEST);
        }
    }

    @DeleteMapping("/api/admin/repair-phone-categories/{id}")
    public ResponseEntity<Map<String, Object>> delete(@PathVariable Long id) {
        try {
            service.delete(id);
            return res(true, "Xóa danh mục điện thoại thành công", null, null, HttpStatus.OK);
        } catch (RuntimeException e) {
            return res(false, "Xóa danh mục điện thoại thất bại", null, e.getMessage(), HttpStatus.BAD_REQUEST);
        }
    }
}
