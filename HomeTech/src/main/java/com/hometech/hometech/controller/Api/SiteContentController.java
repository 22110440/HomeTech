package com.hometech.hometech.controller.Api;

import com.hometech.hometech.enums.BannerType;
import com.hometech.hometech.model.Banner;
import com.hometech.hometech.model.FooterContent;
import com.hometech.hometech.service.BannerService;
import com.hometech.hometech.service.FooterContentService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/content")
public class SiteContentController {

    private final BannerService bannerService;
    private final FooterContentService footerContentService;

    public SiteContentController(BannerService bannerService,
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
        BannerType bannerType = resolveType(type, BannerType.BANNER);
        List<Banner> banners = bannerService.getActiveBanners(bannerType);
        return buildResponse(true, "Lấy danh sách banner thành công", banners, HttpStatus.OK);
    }

    @GetMapping("/sliders")
    public ResponseEntity<Map<String, Object>> getSliders() {
        List<Banner> sliders = bannerService.getActiveBanners(BannerType.SLIDER);
        return buildResponse(true, "Lấy danh sách slider thành công", sliders, HttpStatus.OK);
    }

    @GetMapping("/footer")
    public ResponseEntity<Map<String, Object>> getFooter() {
        FooterContent footer = footerContentService.getActiveFooter();
        return buildResponse(true, "Lấy thông tin footer thành công", footer, HttpStatus.OK);
    }

    private BannerType resolveType(String type, BannerType defaultType) {
        if (!StringUtils.hasText(type)) {
            return defaultType;
        }
        try {
            return BannerType.valueOf(type.toUpperCase());
        } catch (IllegalArgumentException ex) {
            return defaultType;
        }
    }
}

