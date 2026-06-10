package com.hometech.hometech.controller.Api;

import com.hometech.hometech.dto.RepairServicePackageRequest;
import com.hometech.hometech.model.RepairServicePackage;
import com.hometech.hometech.service.RepairServicePackageService;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/repair-packages")
public class RepairServicePackageAdminController {

    private final RepairServicePackageService repairServicePackageService;

    public RepairServicePackageAdminController(RepairServicePackageService repairServicePackageService) {
        this.repairServicePackageService = repairServicePackageService;
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
    public ResponseEntity<Map<String, Object>> getAllRepairPackages(@RequestParam(required = false) String phoneType) {
        List<RepairServicePackage> packages = repairServicePackageService.getAllPackages(phoneType);
        return buildResponse(true, "Lấy danh sách gói sửa chữa (admin) thành công", packages, null, HttpStatus.OK);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getRepairPackageById(@PathVariable Long id) {
        try {
            RepairServicePackage data = repairServicePackageService.getPackageById(id);
            return buildResponse(true, "Lấy chi tiết gói dịch vụ thành công", data, null, HttpStatus.OK);
        } catch (RuntimeException e) {
            return buildResponse(false, "Lấy chi tiết gói dịch vụ thất bại", null, e.getMessage(), HttpStatus.NOT_FOUND);
        }
    }

    /**
     * Serve the uploaded image for a repair package.
     */
    @GetMapping("/{id}/image")
    public ResponseEntity<byte[]> getRepairPackageImage(@PathVariable Long id) {
        try {
            RepairServicePackage pkg = repairServicePackageService.getPackageById(id);
            if (pkg.getImageData() == null || pkg.getImageData().length == 0) {
                return ResponseEntity.notFound().build();
            }
            String contentType = pkg.getImageContentType() != null ? pkg.getImageContentType() : "image/jpeg";
            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .body(pkg.getImageData());
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, Object>> createRepairPackage(
            @RequestParam("serviceName") String serviceName,
            @RequestParam("phoneType") String phoneType,
            @RequestParam("serviceCategory") String serviceCategory,
            @RequestParam("price") BigDecimal price,
            @RequestParam("estimatedDurationMinutes") Integer estimatedDurationMinutes,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam(value = "active", required = false, defaultValue = "true") Boolean active,
            @RequestParam(value = "imageFile", required = false) MultipartFile imageFile
    ) {
        try {
            RepairServicePackageRequest request = new RepairServicePackageRequest();
            request.setServiceName(serviceName);
            request.setPhoneType(phoneType);
            request.setServiceCategory(serviceCategory);
            request.setPrice(price);
            request.setEstimatedDurationMinutes(estimatedDurationMinutes);
            request.setDescription(description);
            request.setActive(active);
            request.setImageUrl("");

            RepairServicePackage created = repairServicePackageService.createPackage(request, imageFile);
            return buildResponse(true, "Tạo gói dịch vụ sửa chữa thành công", created, null, HttpStatus.OK);
        } catch (RuntimeException e) {
            return buildResponse(false, "Tạo gói dịch vụ sửa chữa thất bại", null, e.getMessage(), HttpStatus.BAD_REQUEST);
        }
    }

    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, Object>> updateRepairPackage(
            @PathVariable Long id,
            @RequestParam("serviceName") String serviceName,
            @RequestParam("phoneType") String phoneType,
            @RequestParam("serviceCategory") String serviceCategory,
            @RequestParam("price") BigDecimal price,
            @RequestParam("estimatedDurationMinutes") Integer estimatedDurationMinutes,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam(value = "active", required = false, defaultValue = "true") Boolean active,
            @RequestParam(value = "imageFile", required = false) MultipartFile imageFile
    ) {
        try {
            RepairServicePackageRequest request = new RepairServicePackageRequest();
            request.setServiceName(serviceName);
            request.setPhoneType(phoneType);
            request.setServiceCategory(serviceCategory);
            request.setPrice(price);
            request.setEstimatedDurationMinutes(estimatedDurationMinutes);
            request.setDescription(description);
            request.setActive(active);
            request.setImageUrl("");

            RepairServicePackage updated = repairServicePackageService.updatePackage(id, request, imageFile);
            return buildResponse(true, "Cập nhật gói dịch vụ sửa chữa thành công", updated, null, HttpStatus.OK);
        } catch (RuntimeException e) {
            return buildResponse(false, "Cập nhật gói dịch vụ sửa chữa thất bại", null, e.getMessage(), HttpStatus.BAD_REQUEST);
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> deleteRepairPackage(@PathVariable Long id) {
        try {
            repairServicePackageService.deletePackage(id);
            return buildResponse(true, "Xóa gói dịch vụ sửa chữa thành công", null, null, HttpStatus.OK);
        } catch (RuntimeException e) {
            return buildResponse(false, "Xóa gói dịch vụ sửa chữa thất bại", null, e.getMessage(), HttpStatus.BAD_REQUEST);
        }
    }
}

