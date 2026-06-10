package com.hometech.hometech.controller.Api;

import com.hometech.hometech.model.RepairServicePackage;
import com.hometech.hometech.service.RepairServicePackageService;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/repair-packages")
public class RepairServicePackageRestController {

    private final RepairServicePackageService repairServicePackageService;

    public RepairServicePackageRestController(RepairServicePackageService repairServicePackageService) {
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
    public ResponseEntity<Map<String, Object>> getActiveRepairPackages(
            @RequestParam(required = false) String phoneType
    ) {
        List<RepairServicePackage> packages = repairServicePackageService.getActivePackages(phoneType);
        return buildResponse(true, "Lấy danh sách gói sửa chữa thành công", packages, null, HttpStatus.OK);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getRepairPackageDetail(@PathVariable Long id) {
        try {
            RepairServicePackage data = repairServicePackageService.getPackageById(id);
            if (!Boolean.TRUE.equals(data.getActive())) {
                return buildResponse(false, "Gói sửa chữa không hoạt động", null, "Repair package inactive", HttpStatus.BAD_REQUEST);
            }
            return buildResponse(true, "Lấy chi tiết gói sửa chữa thành công", data, null, HttpStatus.OK);
        } catch (RuntimeException e) {
            return buildResponse(false, "Không tìm thấy gói sửa chữa", null, e.getMessage(), HttpStatus.NOT_FOUND);
        }
    }

    /**
     * Serve the uploaded image for a repair package (public access).
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
}

