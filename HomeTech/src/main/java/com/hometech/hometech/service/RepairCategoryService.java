package com.hometech.hometech.service;

import com.hometech.hometech.Repository.RepairCategoryRepository;
import com.hometech.hometech.dto.RepairCategoryRequest;
import com.hometech.hometech.model.RepairCategory;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class RepairCategoryService {

    private final RepairCategoryRepository repository;

    public RepairCategoryService(RepairCategoryRepository repository) {
        this.repository = repository;
    }

    public List<RepairCategory> getActiveCategories() {
        return repository.findByActiveTrueOrderByPhoneTypeAscServiceCategoryAsc();
    }

    public List<RepairCategory> getAllCategories() {
        return repository.findAll();
    }

    public RepairCategory create(RepairCategoryRequest request) {
        validate(request);
        repository.findByPhoneTypeIgnoreCaseAndServiceCategoryIgnoreCase(request.getPhoneType().trim(), request.getServiceCategory().trim())
                .ifPresent((x) -> { throw new RuntimeException("Danh mục sửa chữa đã tồn tại"); });

        RepairCategory category = new RepairCategory();
        category.setPhoneType(request.getPhoneType().trim());
        category.setServiceCategory(request.getServiceCategory().trim());
        category.setActive(request.getActive() == null ? true : request.getActive());
        return repository.save(category);
    }

    public RepairCategory update(Long id, RepairCategoryRequest request) {
        validate(request);
        RepairCategory category = repository.findById(id).orElseThrow(() -> new RuntimeException("Không tìm thấy danh mục sửa chữa"));
        category.setPhoneType(request.getPhoneType().trim());
        category.setServiceCategory(request.getServiceCategory().trim());
        category.setActive(request.getActive() == null ? true : request.getActive());
        return repository.save(category);
    }

    public void delete(Long id) {
        RepairCategory category = repository.findById(id).orElseThrow(() -> new RuntimeException("Không tìm thấy danh mục sửa chữa"));
        repository.delete(category);
    }

    private void validate(RepairCategoryRequest request) {
        if (request.getPhoneType() == null || request.getPhoneType().trim().isEmpty()) {
            throw new RuntimeException("Loại máy không được để trống");
        }
        if (request.getServiceCategory() == null || request.getServiceCategory().trim().isEmpty()) {
            throw new RuntimeException("Danh mục dịch vụ không được để trống");
        }
    }
}
