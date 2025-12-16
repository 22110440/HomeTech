package com.hometech.hometech.service;

import com.hometech.hometech.Repository.CategoryRepository;
import com.hometech.hometech.Repository.ProductRepository;
import com.hometech.hometech.model.Category;
import com.hometech.hometech.model.Product;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class CategoryService {
    private final CategoryRepository categoryRepo;
    private final ProductRepository productRepo;

    public CategoryService(CategoryRepository categoryRepo, ProductRepository productRepo) {
        this.categoryRepo = categoryRepo;
        this.productRepo = productRepo;
    }

    // 🔹 Lấy tất cả danh mục
    public List<Category> getAll() {
        return categoryRepo.findAll();
    }

    // 🔹 Lấy danh mục theo ID
    public Category getById(long id) {
        return categoryRepo.findById(id).orElse(null);
    }

    // 🔹 Thêm hoặc cập nhật danh mục
    public void save(Category category) {
        // Tên danh mục phải có
        if (category.getName() == null || category.getName().trim().isEmpty()) {
            throw new IllegalArgumentException("Category name cannot be empty");
        }

        // Gán quan hệ ngược cho các thuộc tính nếu có (để JPA cascade lưu CategoryAttribute)
        if (category.getAttributes() != null) {
            category.getAttributes().forEach(attr -> attr.setCategory(category));
        }

        categoryRepo.save(category);
    }

    // 🔹 Xóa danh mục
    public void delete(long id) {
        categoryRepo.deleteById(id);
    }

    // 🔹 Lấy danh mục theo tên (không phân biệt hoa thường)
    public Category getByName(String categoryName) {
        return categoryRepo.findAll().stream()
                .filter(c -> c.getName() != null && c.getName().equalsIgnoreCase(categoryName))
                .findFirst()
                .orElse(null);
    }

    // 🔹 Lấy danh sách sản phẩm thuộc danh mục
    public List<Product> getProductsByCategory(long categoryId) {
        Category category = categoryRepo.findById(categoryId).orElse(null);
        if (category == null) {
            return List.of();
        }
        return productRepo.findByCategory(category);
    }

    // 🔹 Lấy danh sách sản phẩm đang hoạt động của danh mục
    public List<Product> getActiveProductsByCategory(long categoryId) {
        Category category = categoryRepo.findById(categoryId).orElse(null);
        if (category == null) {
            return List.of();
        }
        return productRepo.findByCategoryAndHidden(category, false);
    }

    // 🔹 Đếm tổng số sản phẩm trong danh mục
    public long countProductsInCategory(long categoryId) {
        Category category = categoryRepo.findById(categoryId).orElse(null);
        if (category == null) {
            return 0;
        }
        return productRepo.findByCategory(category).size();
    }

    // 🔹 Đếm số sản phẩm đang hoạt động trong danh mục
    public long countActiveProductsInCategory(long categoryId) {
        Category category = categoryRepo.findById(categoryId).orElse(null);
        if (category == null) {
            return 0;
        }
        return productRepo.findByCategoryAndHidden(category, false).size();
    }
}
