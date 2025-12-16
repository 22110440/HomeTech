package com.hometech.hometech.Repository;

import com.hometech.hometech.enums.BannerType;
import com.hometech.hometech.model.Banner;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BannerRepository extends JpaRepository<Banner, Long> {
    List<Banner> findAllByTypeOrderByDisplayOrderAsc(BannerType type);
    List<Banner> findAllByTypeAndActiveTrueOrderByDisplayOrderAsc(BannerType type);
    List<Banner> findAllByActiveTrueOrderByDisplayOrderAsc();
}

