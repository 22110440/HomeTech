package com.hometech.hometech.service;

import com.hometech.hometech.Repository.FooterContentRepository;
import com.hometech.hometech.model.FooterContent;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.List;

@Service
public class FooterContentService {

    private final FooterContentRepository footerContentRepository;

    public FooterContentService(FooterContentRepository footerContentRepository) {
        this.footerContentRepository = footerContentRepository;
    }

    public FooterContent getActiveFooter() {
        return footerContentRepository.findFirstByActiveTrueOrderByUpdatedAtDesc()
                .orElseGet(this::createDefaultFooter);
    }

    public FooterContent getById(Long id) {
        return footerContentRepository.findById(id).orElse(null);
    }

    public List<FooterContent> getAll() {
        return footerContentRepository.findAll();
    }

    public FooterContent upsert(FooterContent payload) {
        FooterContent target;
        if (payload.getId() != null) {
            target = footerContentRepository.findById(payload.getId()).orElse(new FooterContent());
        } else {
            target = footerContentRepository.findFirstByActiveTrueOrderByUpdatedAtDesc()
                    .orElse(new FooterContent());
        }

        target.setAbout(payload.getAbout());
        target.setHotline(payload.getHotline());
        target.setEmail(payload.getEmail());
        target.setAddress(payload.getAddress());
        target.setSupportHours(payload.getSupportHours());
        target.setFacebookUrl(payload.getFacebookUrl());
        target.setInstagramUrl(payload.getInstagramUrl());
        target.setYoutubeUrl(payload.getYoutubeUrl());
        target.setTiktokUrl(payload.getTiktokUrl());
        boolean shouldActive = payload.isActive();
        target.setActive(shouldActive);

        if (!StringUtils.hasText(target.getAbout())) {
            target.setAbout("Giải pháp nhà thông minh HomeTech.");
        }
        if (!StringUtils.hasText(target.getSupportHours())) {
            target.setSupportHours("08:00 - 22:00 (T2 - CN)");
        }

        FooterContent saved = footerContentRepository.save(target);
        if (shouldActive) {
            deactivateOthers(saved.getId());
        }
        return saved;
    }

    private FooterContent createDefaultFooter() {
        FooterContent footer = new FooterContent();
        footer.setAbout("HomeTech - Nâng tầm không gian sống với thiết bị gia dụng thông minh.");
        footer.setHotline("1900 636 555");
        footer.setEmail("support@hometech.vn");
        footer.setAddress("Tầng 10, 27B Nguyễn Đình Chiểu, Quận 1, TP.HCM");
        footer.setSupportHours("08:00 - 22:00 (T2 - CN)");
        footer.setFacebookUrl("https://facebook.com/hometech");
        footer.setInstagramUrl("https://instagram.com/hometech");
        footer.setYoutubeUrl("https://youtube.com/@hometech");
        footer.setTiktokUrl("https://tiktok.com/@hometech");
        footer.setActive(true);
        FooterContent saved = footerContentRepository.save(footer);
        deactivateOthers(saved.getId());
        return saved;
    }

    private void deactivateOthers(Long activeId) {
        if (activeId == null) {
            return;
        }
        footerContentRepository.findAll().stream()
                .filter(item -> !item.getId().equals(activeId) && item.isActive())
                .forEach(item -> {
                    item.setActive(false);
                    footerContentRepository.save(item);
                });
    }
}

