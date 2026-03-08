package com.hometech.hometech.service;

import com.hometech.hometech.Repository.RepairServicePackageRepository;
import com.hometech.hometech.dto.RepairServicePackageRequest;
import com.hometech.hometech.model.RepairServicePackage;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;

@Service
public class RepairServicePackageService {

    private final RepairServicePackageRepository repairServicePackageRepository;

    public RepairServicePackageService(RepairServicePackageRepository repairServicePackageRepository) {
        this.repairServicePackageRepository = repairServicePackageRepository;
    }

    public List<RepairServicePackage> getActivePackages(String phoneType) {
        if (phoneType != null && !phoneType.trim().isEmpty()) {
            return repairServicePackageRepository.findByPhoneTypeIgnoreCaseAndActiveTrueOrderByUpdatedAtDesc(phoneType.trim());
        }
        return repairServicePackageRepository.findByActiveTrueOrderByUpdatedAtDesc();
    }

    public List<RepairServicePackage> getAllPackages(String phoneType) {
        if (phoneType != null && !phoneType.trim().isEmpty()) {
            return repairServicePackageRepository.findByPhoneTypeIgnoreCaseOrderByUpdatedAtDesc(phoneType.trim());
        }
        return repairServicePackageRepository.findAll();
    }

    public RepairServicePackage getPackageById(Long id) {
        return repairServicePackageRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy gói dịch vụ sửa chữa"));
    }

    public RepairServicePackage createPackage(RepairServicePackageRequest request) {
        validateRequest(request);

        RepairServicePackage repairServicePackage = new RepairServicePackage();
        applyRequestToEntity(repairServicePackage, request);

        return repairServicePackageRepository.save(repairServicePackage);
    }

    public RepairServicePackage updatePackage(Long id, RepairServicePackageRequest request) {
        validateRequest(request);

        RepairServicePackage existing = getPackageById(id);
        applyRequestToEntity(existing, request);

        return repairServicePackageRepository.save(existing);
    }

    public void deletePackage(Long id) {
        RepairServicePackage existing = getPackageById(id);
        repairServicePackageRepository.delete(existing);
    }

    private void applyRequestToEntity(RepairServicePackage entity, RepairServicePackageRequest request) {
        entity.setPhoneType(request.getPhoneType().trim());
        entity.setServiceCategory(request.getServiceCategory().trim());
        entity.setServiceName(request.getServiceName().trim());
        entity.setDescription(request.getDescription() == null ? null : request.getDescription().trim());
        entity.setImageUrl(request.getImageUrl() == null ? null : request.getImageUrl().trim());
        entity.setPrice(request.getPrice());
        entity.setEstimatedDurationMinutes(request.getEstimatedDurationMinutes());
        entity.setActive(request.getActive() == null ? true : request.getActive());
    }

    private void validateRequest(RepairServicePackageRequest request) {
        if (request.getPhoneType() == null || request.getPhoneType().trim().isEmpty()) {
            throw new RuntimeException("Loại điện thoại không được để trống");
        }

        if (request.getServiceCategory() == null || request.getServiceCategory().trim().isEmpty()) {
            throw new RuntimeException("Danh mục dịch vụ không được để trống");
        }

        if (request.getServiceName() == null || request.getServiceName().trim().isEmpty()) {
            throw new RuntimeException("Tên gói dịch vụ không được để trống");
        }

        if (request.getPrice() == null || request.getPrice().compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("Giá gói dịch vụ phải lớn hơn 0");
        }

        if (request.getEstimatedDurationMinutes() == null || request.getEstimatedDurationMinutes() <= 0) {
            throw new RuntimeException("Thời lượng dự kiến phải lớn hơn 0 phút");
        }
    }
}
