package com.hometech.hometech.Repository;

import com.hometech.hometech.model.RepairPhoneCategory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RepairPhoneCategoryRepository extends JpaRepository<RepairPhoneCategory, Long> {
    List<RepairPhoneCategory> findByActiveTrueOrderByNameAsc();
    Optional<RepairPhoneCategory> findByNameIgnoreCase(String name);
    boolean existsByNameIgnoreCaseAndIdNot(String name, Long id);
}
