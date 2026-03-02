package com.hometech.hometech.controller.Api;

import com.hometech.hometech.model.RepairServicePackage;
import com.hometech.hometech.service.RepairServicePackageService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
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
}
