package com.hometech.hometech.service;

import com.hometech.hometech.Repository.CategoryRepository;
import com.hometech.hometech.Repository.ProductRepository;
import com.hometech.hometech.model.Category;
import com.hometech.hometech.model.Product;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ProductServiceTest {

//    @Mock
//    private ProductRepository productRepository;
//
//    @Mock
//    private CategoryRepository categoryRepository;
//
//    @InjectMocks
//    private ProductService productService;
//
//    private List<Product> mockProducts;
//    private Category mockCategory;
//
//    @BeforeEach
//    void setUp() {
//        // Create mock category
//        mockCategory = new Category();
//        mockCategory.setCategoryID(1);
//        mockCategory.setCategoryName("Smartphone");
//
//        // Create mock products
//        Product product1 = new Product();
//        product1.setProductID(1);
//        product1.setProductName("iPhone 15");
//        product1.setSoldCount(100);
//        product1.setCategory(mockCategory);
//
//        Product product2 = new Product();
//        product2.setProductID(2);
//        product2.setProductName("Samsung Galaxy S24");
//        product2.setSoldCount(80);
//        product2.setCategory(mockCategory);
//
//        Product product3 = new Product();
//        product3.setProductID(3);
//        product3.setProductName("Google Pixel 9");
//        product3.setSoldCount(60);
//        product3.setCategory(mockCategory);
//
//        mockProducts = Arrays.asList(product1, product2, product3);
//    }
//
//    @Test
//    void testGetTop10BestSellingProducts_WithEnoughProducts() {
//        // Given
//        when(productRepository.findTop10ByOrderBySalesDesc()).thenReturn(mockProducts);
//
//        // When
//        List<Product> result = productService.getTop10BestSellingProducts();
//
//        // Then
//        assertNotNull(result);
//        assertEquals(3, result.size());
//        verify(productRepository).findTop10ByOrderBySalesDesc();
//        verify(productRepository, never()).findAll();
//    }
//
//    @Test
//    void testGetTop10BestSellingProducts_WithFewerThan10Products() {
//        // Given
//        when(productRepository.findTop10ByOrderBySalesDesc()).thenReturn(Collections.emptyList());
//        when(productRepository.findAll()).thenReturn(mockProducts);
//
//        // When
//        List<Product> result = productService.getTop10BestSellingProducts();
//
//        // Then
//        assertNotNull(result);
//        assertEquals(3, result.size());
//        verify(productRepository).findTop10ByOrderBySalesDesc();
//        verify(productRepository).findAll();
//    }
//
//    @Test
//    void testGetTop10BestSellingProductsByCategory_WithValidCategory() {
//        // Given
//        String categoryName = "Smartphone";
//        when(productRepository.findTop10ByCategory_CategoryNameOrderBySalesDesc(categoryName))
//                .thenReturn(mockProducts);
//
//        // When
//        List<Product> result = productService.getTop10BestSellingProductsByCategory(categoryName);
//
//        // Then
//        assertNotNull(result);
//        assertEquals(3, result.size());
//        verify(productRepository).findTop10ByCategory_CategoryNameOrderBySalesDesc(categoryName);
//    }
//
//    @Test
//    void testGetTop10BestSellingProductsByCategory_WithEmptyCategory() {
//        // Given
//        String categoryName = "";
//
//        // When
//        List<Product> result = productService.getTop10BestSellingProductsByCategory(categoryName);
//
//        // Then
//        assertNotNull(result);
//        assertTrue(result.isEmpty());
//        verify(productRepository, never()).findTop10ByCategory_CategoryNameOrderBySalesDesc(any());
//    }
//
//    @Test
//    void testGetTop10BestSellingProductsByCategory_WithNullCategory() {
//        // Given
//        String categoryName = null;
//
//        // When
//        List<Product> result = productService.getTop10BestSellingProductsByCategory(categoryName);
//
//        // Then
//        assertNotNull(result);
//        assertTrue(result.isEmpty());
//        verify(productRepository, never()).findTop10ByCategory_CategoryNameOrderBySalesDesc(any());
//    }
}

