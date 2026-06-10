package com.hometech.hometech.Repository;

import com.hometech.hometech.model.RepairServicePackage;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface RepairServicePackageRepository extends JpaRepository<RepairServicePackage, Long> {
    List<RepairServicePackage> findByActiveTrueOrderByUpdatedAtDesc();

    List<RepairServicePackage> findByPhoneTypeIgnoreCaseAndActiveTrueOrderByUpdatedAtDesc(String phoneType);

    List<RepairServicePackage> findByPhoneTypeIgnoreCaseOrderByUpdatedAtDesc(String phoneType);

    @Query("""
            select p
            from RepairServicePackage p
            where p.active = true
              and (:keyword is null
                   or lower(p.phoneType) like lower(concat('%', :keyword, '%'))
                   or lower(p.serviceCategory) like lower(concat('%', :keyword, '%'))
                   or lower(p.serviceName) like lower(concat('%', :keyword, '%'))
                   or lower(coalesce(p.description, '')) like lower(concat('%', :keyword, '%')))
              and (:maxPrice is null or p.price <= :maxPrice)
            order by p.updatedAt desc
            """)
    List<RepairServicePackage> searchActiveForChatbot(@Param("keyword") String keyword,
                                                      @Param("maxPrice") java.math.BigDecimal maxPrice,
                                                      Pageable pageable);
}
