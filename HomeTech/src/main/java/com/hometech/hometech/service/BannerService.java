package com.hometech.hometech.service;

import com.hometech.hometech.Repository.BannerRepository;
import com.hometech.hometech.enums.BannerType;
import com.hometech.hometech.model.Banner;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;

@Service
public class BannerService {

    private final BannerRepository bannerRepository;

    public BannerService(BannerRepository bannerRepository) {
        this.bannerRepository = bannerRepository;
    }

    public List<Banner> getActiveBanners(BannerType type) {
        List<Banner> banners;
        if (type != null) {
            banners = bannerRepository.findAllByTypeAndActiveTrueOrderByDisplayOrderAsc(type);
        } else {
            banners = bannerRepository.findAllByActiveTrueOrderByDisplayOrderAsc();
        }
        LocalDateTime now = LocalDateTime.now();
        List<Banner> activeBanners = banners.stream()
                .filter(banner -> isWithinSchedule(banner, now))
                .toList();
        if (type == BannerType.SLIDER) {
            return activeBanners.stream().limit(2).toList();
        }
        return activeBanners;
    }

    public List<Banner> getAll(BannerType type) {
        if (type != null) {
            return bannerRepository.findAllByTypeOrderByDisplayOrderAsc(type);
        }
        return bannerRepository.findAll();
    }

    public Banner getById(Long id) {
        return bannerRepository.findById(id).orElse(null);
    }

    public Banner create(Banner banner) {
        validateBanner(banner);
        enforceSliderLimit(banner, false);
        return bannerRepository.save(banner);
    }

    public Banner create(Banner banner, MultipartFile imageFile) {
        applyImageFile(banner, imageFile);
        return create(banner);
    }

    public Banner update(Long id, Banner payload) {
        Banner existing = getById(id);
        if (existing == null) {
            return null;
        }

        boolean wasSlider = existing.getType() == BannerType.SLIDER;
        if (payload.getType() != null) {
            existing.setType(payload.getType());
        }
        if (StringUtils.hasText(payload.getTitle())) {
            existing.setTitle(payload.getTitle());
        }
        existing.setSubtitle(payload.getSubtitle());
        if (StringUtils.hasText(payload.getImageUrl())) {
            existing.setImageUrl(payload.getImageUrl());
        }
        if (payload.getImageData() != null && payload.getImageData().length > 0) {
            existing.setImageData(payload.getImageData());
            existing.setImageContentType(payload.getImageContentType());
            existing.setImageFileName(payload.getImageFileName());
            existing.setImageUrl("");
        }
        existing.setRedirectUrl(payload.getRedirectUrl());
        existing.setButtonText(payload.getButtonText());
        if (payload.getDisplayOrder() != null) {
            existing.setDisplayOrder(payload.getDisplayOrder());
        }
        existing.setActive(payload.isActive());
        existing.setShowOnMobile(payload.isShowOnMobile());
        existing.setStartAt(payload.getStartAt());
        existing.setEndAt(payload.getEndAt());

        validateBanner(existing);
        enforceSliderLimit(existing, wasSlider);
        return bannerRepository.save(existing);
    }

    public Banner update(Long id, Banner payload, MultipartFile imageFile) {
        Banner existing = getById(id);
        if (existing == null) {
            return null;
        }
        applyImageFile(payload, imageFile);
        return update(id, payload);
    }

    public void delete(Long id) {
        bannerRepository.deleteById(id);
    }

    public Banner toggleActive(Long id, boolean active) {
        Banner banner = getById(id);
        if (banner == null) {
            return null;
        }
        banner.setActive(active);
        return bannerRepository.save(banner);
    }

    private boolean isWithinSchedule(Banner banner, LocalDateTime now) {
        if (!banner.isActive()) {
            return false;
        }
        if (banner.getStartAt() != null && banner.getStartAt().isAfter(now)) {
            return false;
        }
        if (banner.getEndAt() != null && banner.getEndAt().isBefore(now)) {
            return false;
        }
        return true;
    }

    private void validateBanner(Banner banner) {
        if (banner.getType() == null) {
            throw new IllegalArgumentException("Banner type is required");
        }
        if (!StringUtils.hasText(banner.getTitle())) {
            banner.setTitle(defaultTitle(banner));
        }
        boolean hasUploadedImage = banner.getImageData() != null && banner.getImageData().length > 0;
        if (!hasUploadedImage && !StringUtils.hasText(banner.getImageUrl())) {
            throw new IllegalArgumentException("Vui lòng chọn ảnh hiển thị");
        }
        if (!StringUtils.hasText(banner.getImageUrl())) {
            banner.setImageUrl("");
        }
        if (Objects.isNull(banner.getDisplayOrder())) {
            banner.setDisplayOrder(0);
        }
    }

    private void applyImageFile(Banner banner, MultipartFile imageFile) {
        if (imageFile == null || imageFile.isEmpty()) {
            return;
        }
        try {
            banner.setImageData(imageFile.getBytes());
            banner.setImageContentType(StringUtils.hasText(imageFile.getContentType())
                    ? imageFile.getContentType()
                    : "image/jpeg");
            banner.setImageFileName(imageFile.getOriginalFilename());
            banner.setImageUrl("");
        } catch (IOException e) {
            throw new IllegalArgumentException("Không thể đọc file ảnh: " + e.getMessage());
        }
    }

    private void enforceSliderLimit(Banner banner, boolean wasSlider) {
        if (banner.getType() != BannerType.SLIDER || wasSlider) {
            return;
        }
        long currentSliderCount = bannerRepository.findAllByTypeOrderByDisplayOrderAsc(BannerType.SLIDER).size();
        if (currentSliderCount >= 2) {
            throw new IllegalArgumentException("Slider cố định hai bên chỉ được quản lý tối đa 2 ảnh");
        }
    }

    private String defaultTitle(Banner banner) {
        String typeLabel = banner.getType() == BannerType.SLIDER ? "Ảnh cạnh trang" : "Banner trang chủ";
        String fileName = banner.getImageFileName();
        if (StringUtils.hasText(fileName)) {
            return typeLabel + " - " + fileName;
        }
        return typeLabel;
    }
}
