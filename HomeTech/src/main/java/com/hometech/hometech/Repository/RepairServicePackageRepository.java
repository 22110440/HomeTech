package com.hometech.hometech.Repository;

import com.hometech.hometech.model.RepairServicePackage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RepairServicePackageRepository extends JpaRepository<RepairServicePackage, Long> {
    List<RepairServicePackage> findByActiveTrueOrderByUpdatedAtDesc();

    List<RepairServicePackage> findByPhoneTypeIgnoreCaseAndActiveTrueOrderByUpdatedAtDesc(String phoneType);

    List<RepairServicePackage> findByPhoneTypeIgnoreCaseOrderByUpdatedAtDesc(String phoneType);
}
