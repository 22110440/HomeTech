package com.hometech.hometech.service;

import com.hometech.hometech.Repository.RepairPhoneCategoryRepository;
import com.hometech.hometech.dto.RepairSimpleCategoryRequest;
import com.hometech.hometech.model.RepairPhoneCategory;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;

@Service
public class RepairPhoneCategoryService {

    private final RepairPhoneCategoryRepository repository;

    public RepairPhoneCategoryService(RepairPhoneCategoryRepository repository) {
        this.repository = repository;
    }

    public List<RepairPhoneCategory> getActive() {
        return repository.findByActiveTrueOrderByNameAsc();
    }

    public List<RepairPhoneCategory> getAll() {
        return repository.findAll().stream()
                .sorted(Comparator.comparing(RepairPhoneCategory::getName, String.CASE_INSENSITIVE_ORDER))
                .toList();
    }

    public RepairPhoneCategory create(RepairSimpleCategoryRequest request) {
        String name = validateName(request);
        repository.findByNameIgnoreCase(name).ifPresent((x) -> {
            throw new RuntimeException("Danh mục điện thoại đã tồn tại");
        });

        RepairPhoneCategory category = new RepairPhoneCategory();
        category.setName(name);
        category.setActive(request.getActive() == null ? true : request.getActive());
        return repository.save(category);
    }

    public RepairPhoneCategory update(Long id, RepairSimpleCategoryRequest request) {
        String name = validateName(request);
        RepairPhoneCategory category = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy danh mục điện thoại"));

        if (repository.existsByNameIgnoreCaseAndIdNot(name, id)) {
            throw new RuntimeException("Danh mục điện thoại đã tồn tại");
        }

        category.setName(name);
        category.setActive(request.getActive() == null ? true : request.getActive());
        return repository.save(category);
    }

    public void delete(Long id) {
        RepairPhoneCategory category = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy danh mục điện thoại"));
        repository.delete(category);
    }

    private String validateName(RepairSimpleCategoryRequest request) {
        if (request == null || request.getName() == null || request.getName().trim().isEmpty()) {
            throw new RuntimeException("Tên danh mục điện thoại không được để trống");
        }
        return request.getName().trim();
    }
}
