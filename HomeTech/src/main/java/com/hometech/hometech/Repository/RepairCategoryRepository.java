package com.hometech.hometech.Repository;

import com.hometech.hometech.model.RepairCategory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RepairCategoryRepository extends JpaRepository<RepairCategory, Long> {
    List<RepairCategory> findByActiveTrueOrderByPhoneTypeAscServiceCategoryAsc();
    Optional<RepairCategory> findByPhoneTypeIgnoreCaseAndServiceCategoryIgnoreCase(String phoneType, String serviceCategory);
}
