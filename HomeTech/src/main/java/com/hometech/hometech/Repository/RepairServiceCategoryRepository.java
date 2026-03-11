package com.hometech.hometech.Repository;

import com.hometech.hometech.model.RepairServiceCategory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RepairServiceCategoryRepository extends JpaRepository<RepairServiceCategory, Long> {
    List<RepairServiceCategory> findByActiveTrueOrderByNameAsc();
    Optional<RepairServiceCategory> findByNameIgnoreCase(String name);
    boolean existsByNameIgnoreCaseAndIdNot(String name, Long id);
}
