package com.hometech.hometech.service;

import com.hometech.hometech.Repository.BannerRepository;
import com.hometech.hometech.enums.BannerType;
import com.hometech.hometech.model.Banner;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

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
        return banners.stream()
                .filter(banner -> isWithinSchedule(banner, now))
                .toList();
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
        return bannerRepository.save(banner);
    }

    public Banner update(Long id, Banner payload) {
        Banner existing = getById(id);
        if (existing == null) {
            return null;
        }

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
        return bannerRepository.save(existing);
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
            throw new IllegalArgumentException("Banner title is required");
        }
        if (!StringUtils.hasText(banner.getImageUrl())) {
            throw new IllegalArgumentException("Banner imageUrl is required");
        }
        if (Objects.isNull(banner.getDisplayOrder())) {
            banner.setDisplayOrder(0);
        }
    }
}

