package com.hometech.hometech.controller.Thymleaf;

import com.hometech.hometech.model.Category;
import com.hometech.hometech.model.Product;
import com.hometech.hometech.service.CategoryService;
import com.hometech.hometech.service.ProductService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.ui.Model;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class HomeControllerTest {

//    @Mock
//    private ProductService productService;
//
//    @Mock
//    private CategoryService categoryService;
//
//    @Mock
//    private Model model;
//
//    @InjectMocks
////    private HomeController homeController;
//
//    private List<Product> mockProducts;
//    private List<Category> mockCategories;
//
//    @BeforeEach
//    void setUp() {
//        // Create mock category
//        Category category = new Category();
////        category.setCategoryID(1);
////        category.setCategoryName("Smartphone");
//
//        // Create mock products
//        Product product1 = new Product();
////        product1.setProductID(1);
////        product1.setProductName("iPhone 15");
////        product1.setSoldCount(100);
//        product1.setCategory(category);
//
//        Product product2 = new Product();
////        product2.setProductID(2);
////        product2.setProductName("Samsung Galaxy S24");
////        product2.setSoldCount(80);
//        product2.setCategory(category);
//
//        mockProducts = Arrays.asList(product1, product2);
//        mockCategories = Arrays.asList(category);
//    }
//
//    @Test
//    void testHome_DefaultBehavior() {
//        // Given
//        when(categoryService.getAll()).thenReturn(mockCategories);
//        when(productService.getProductsAddedInLast7Days()).thenReturn(Collections.emptyList());
//        when(productService.getTop10BestSellingProducts()).thenReturn(mockProducts);
//
//        // When
////        String result = homeController.home(model, null);
//
//        // Then
////        assertEquals("home", result);
//
//        verify(categoryService).getAll();
//        verify(productService).getProductsAddedInLast7Days();
//        verify(productService).getTop10BestSellingProducts();
//
//        verify(model).addAttribute("categories", mockCategories);
//        verify(model).addAttribute("newProducts", Collections.emptyList());
//        verify(model).addAttribute(eq("displayProducts"), any(List.class));
//        verify(model).addAttribute("title", "Trang chủ - HomeTech");
//        verify(model).addAttribute("pageTitle", "Top 10 Sản phẩm Bán Chạy");
//        verify(model).addAttribute("selectedCategory", "all");
//        verify(model).addAttribute(eq("debugProductCount"), any(Integer.class));
//    }
//
//    @Test
//    void testHome_WithCategory() {
//        // Given
//        String category = "Smartphone";
//        when(categoryService.getAll()).thenReturn(mockCategories);
//        when(productService.getProductsAddedInLast7Days()).thenReturn(Collections.emptyList());
//        when(productService.getTop10BestSellingProductsByCategory(category)).thenReturn(mockProducts);
//
//        // When
////        String result = homeController.home(model, category);
//
//        // Then
//        assertEquals("home", result);
//
//        verify(categoryService).getAll();
//        verify(productService).getProductsAddedInLast7Days();
//        verify(productService).getTop10BestSellingProductsByCategory(category);
//
//        verify(model).addAttribute("categories", mockCategories);
//        verify(model).addAttribute("newProducts", Collections.emptyList());
//        verify(model).addAttribute(eq("displayProducts"), any(List.class));
//        verify(model).addAttribute("title", "Trang chủ - HomeTech");
//        verify(model).addAttribute("pageTitle", "Sản phẩm " + category);
//        verify(model).addAttribute("selectedCategory", category);
//        verify(model).addAttribute(eq("debugProductCount"), any(Integer.class));
//    }
//
//    @Test
//    void testHome_WithEmptyCategory() {
//        // Given
//        String category = "";
//        when(categoryService.getAll()).thenReturn(mockCategories);
//        when(productService.getProductsAddedInLast7Days()).thenReturn(Collections.emptyList());
//        when(productService.getTop10BestSellingProducts()).thenReturn(mockProducts);
//
//        // When
////        String result = homeController.home(model, category);
//
//        // Then
////        assertEquals("home", result);
//        verify(productService).getTop10BestSellingProducts(); // Should use default behavior
//        verify(model).addAttribute("pageTitle", "Top 10 Sản phẩm Bán Chạy");
//    }
//
//    @Test
//    void testHome_WithAllCategory() {
//        // Given
//        String category = "all";
//        when(categoryService.getAll()).thenReturn(mockCategories);
//        when(productService.getProductsAddedInLast7Days()).thenReturn(Collections.emptyList());
//        when(productService.getTop10BestSellingProducts()).thenReturn(mockProducts);
//
//        // When
//        String result = homeController.home(model, category);
//
//        // Then
//        assertEquals("home", result);
//        verify(productService).getTop10BestSellingProducts(); // Should use default behavior
//        verify(model).addAttribute("pageTitle", "Top 10 Sản phẩm Bán Chạy");
//    }
}

