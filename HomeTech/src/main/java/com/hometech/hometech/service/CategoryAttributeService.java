package com.hometech.hometech.service;

import com.hometech.hometech.Repository.CategoryAttributeRepository;
import com.hometech.hometech.Repository.CategoryRepository;
import com.hometech.hometech.model.Category;
import com.hometech.hometech.model.CategoryAttribute;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class CategoryAttributeService {

    private final CategoryAttributeRepository attributeRepository;
    private final CategoryRepository categoryRepository;

    public CategoryAttributeService(CategoryAttributeRepository attributeRepository,
                                    CategoryRepository categoryRepository) {
        this.attributeRepository = attributeRepository;
        this.categoryRepository = categoryRepository;
    }

    public List<CategoryAttribute> getByCategoryId(Long categoryId) {
        return attributeRepository.findByCategory_Id(categoryId);
    }

    public CategoryAttribute createForCategory(Long categoryId, CategoryAttribute attribute) {
        Category category = categoryRepository.findById(categoryId).orElse(null);
        if (category == null) {
            throw new IllegalArgumentException("Category not found");
        }
        attribute.setCategory(category);
        return attributeRepository.save(attribute);
    }

    public CategoryAttribute updateAttribute(Long id, CategoryAttribute updated) {
        CategoryAttribute existing = attributeRepository.findById(id).orElse(null);
        if (existing == null) {
            throw new IllegalArgumentException("Attribute not found");
        }
        existing.setName(updated.getName());
        existing.setCode(updated.getCode());
        return attributeRepository.save(existing);
    }

    public void deleteAttribute(Long id) {
        attributeRepository.deleteById(id);
    }
}


