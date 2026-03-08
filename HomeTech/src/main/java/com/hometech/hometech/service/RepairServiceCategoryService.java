package com.hometech.hometech.service;

import com.hometech.hometech.Repository.RepairServiceCategoryRepository;
import com.hometech.hometech.dto.RepairSimpleCategoryRequest;
import com.hometech.hometech.model.RepairServiceCategory;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;

@Service
public class RepairServiceCategoryService {

    private final RepairServiceCategoryRepository repository;

    public RepairServiceCategoryService(RepairServiceCategoryRepository repository) {
        this.repository = repository;
    }

    public List<RepairServiceCategory> getActive() {
        return repository.findByActiveTrueOrderByNameAsc();
    }

    public List<RepairServiceCategory> getAll() {
        return repository.findAll().stream()
                .sorted(Comparator.comparing(RepairServiceCategory::getName, String.CASE_INSENSITIVE_ORDER))
                .toList();
    }

    public RepairServiceCategory create(RepairSimpleCategoryRequest request) {
        String name = validateName(request);
        repository.findByNameIgnoreCase(name).ifPresent((x) -> {
            throw new RuntimeException("Danh mục sửa chữa đã tồn tại");
        });

        RepairServiceCategory category = new RepairServiceCategory();
        category.setName(name);
        category.setActive(request.getActive() == null ? true : request.getActive());
        return repository.save(category);
    }

    public RepairServiceCategory update(Long id, RepairSimpleCategoryRequest request) {
        String name = validateName(request);
        RepairServiceCategory category = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy danh mục sửa chữa"));

        if (repository.existsByNameIgnoreCaseAndIdNot(name, id)) {
            throw new RuntimeException("Danh mục sửa chữa đã tồn tại");
        }

        category.setName(name);
        category.setActive(request.getActive() == null ? true : request.getActive());
        return repository.save(category);
    }

    public void delete(Long id) {
        RepairServiceCategory category = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy danh mục sửa chữa"));
        repository.delete(category);
    }

    private String validateName(RepairSimpleCategoryRequest request) {
        if (request == null || request.getName() == null || request.getName().trim().isEmpty()) {
            throw new RuntimeException("Tên danh mục sửa chữa không được để trống");
        }
        return request.getName().trim();
    }
}
