package com.hometech.hometech.controller.Api;

import com.hometech.hometech.enums.BannerType;
import com.hometech.hometech.model.Banner;
import com.hometech.hometech.model.FooterContent;
import com.hometech.hometech.service.BannerService;
import com.hometech.hometech.service.FooterContentService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/content")
public class SiteContentAdminController {

    private final BannerService bannerService;
    private final FooterContentService footerContentService;

    public SiteContentAdminController(BannerService bannerService,
                                      FooterContentService footerContentService) {
        this.bannerService = bannerService;
        this.footerContentService = footerContentService;
    }

    private ResponseEntity<Map<String, Object>> buildResponse(
            boolean success,
            String message,
            Object data,
            HttpStatus status
    ) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("success", success);
        payload.put("message", message);
        payload.put("data", data);
        return ResponseEntity.status(status).body(payload);
    }

    @GetMapping("/banners")
    public ResponseEntity<Map<String, Object>> getBanners(@RequestParam(name = "type", required = false) String type) {
        BannerType bannerType = parseType(type);
        List<Banner> banners = bannerService.getAll(bannerType);
        return buildResponse(true, "Lấy danh sách banner/slider thành công", banners, HttpStatus.OK);
    }

    @GetMapping("/banners/{id}")
    public ResponseEntity<Map<String, Object>> getBanner(@PathVariable Long id) {
        Banner banner = bannerService.getById(id);
        if (banner == null) {
            return buildResponse(false, "Không tìm thấy banner", null, HttpStatus.NOT_FOUND);
        }
        return buildResponse(true, "Lấy banner thành công", banner, HttpStatus.OK);
    }

    @PostMapping("/banners")
    public ResponseEntity<Map<String, Object>> createBanner(@RequestBody Banner banner) {
        try {
            Banner saved = bannerService.create(banner);
            return buildResponse(true, "Tạo banner/slider thành công", saved, HttpStatus.CREATED);
        } catch (IllegalArgumentException e) {
            return buildResponse(false, e.getMessage(), null, HttpStatus.BAD_REQUEST);
        }
    }

    @PutMapping("/banners/{id}")
    public ResponseEntity<Map<String, Object>> updateBanner(@PathVariable Long id, @RequestBody Banner banner) {
        try {
            Banner updated = bannerService.update(id, banner);
            if (updated == null) {
                return buildResponse(false, "Không tìm thấy banner", null, HttpStatus.NOT_FOUND);
            }
            return buildResponse(true, "Cập nhật banner/slider thành công", updated, HttpStatus.OK);
        } catch (IllegalArgumentException e) {
            return buildResponse(false, e.getMessage(), null, HttpStatus.BAD_REQUEST);
        }
    }

    @PutMapping("/banners/{id}/toggle")
    public ResponseEntity<Map<String, Object>> toggleBanner(@PathVariable Long id,
                                                            @RequestParam(name = "active", required = false) Boolean active) {
        Banner existing = bannerService.getById(id);
        if (existing == null) {
            return buildResponse(false, "Không tìm thấy banner", null, HttpStatus.NOT_FOUND);
        }
        boolean targetState = active != null ? active : !existing.isActive();
        Banner updated = bannerService.toggleActive(id, targetState);
        return buildResponse(true, "Cập nhật trạng thái banner thành công", updated, HttpStatus.OK);
    }

    @DeleteMapping("/banners/{id}")
    public ResponseEntity<Map<String, Object>> deleteBanner(@PathVariable Long id) {
        Banner existing = bannerService.getById(id);
        if (existing == null) {
            return buildResponse(false, "Không tìm thấy banner", null, HttpStatus.NOT_FOUND);
        }
        bannerService.delete(id);
        return buildResponse(true, "Xóa banner/slider thành công", null, HttpStatus.OK);
    }

    @GetMapping("/footer")
    public ResponseEntity<Map<String, Object>> getFooter() {
        FooterContent footer = footerContentService.getActiveFooter();
        return buildResponse(true, "Lấy footer thành công", footer, HttpStatus.OK);
    }

    @PutMapping("/footer")
    public ResponseEntity<Map<String, Object>> updateFooter(@RequestBody FooterContent footerContent) {
        FooterContent saved = footerContentService.upsert(footerContent);
        return buildResponse(true, "Cập nhật footer thành công", saved, HttpStatus.OK);
    }

    private BannerType parseType(String type) {
        if (!StringUtils.hasText(type)) {
            return null;
        }
        try {
            return BannerType.valueOf(type.toUpperCase());
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }
}

