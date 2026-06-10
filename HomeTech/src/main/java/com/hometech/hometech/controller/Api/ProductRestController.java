package com.hometech.hometech.controller.Api;

import com.hometech.hometech.dto.ProductImageDTO;
import com.hometech.hometech.model.Category;
import com.hometech.hometech.model.Product;
import com.hometech.hometech.model.ProductAttributeValue;
import com.hometech.hometech.model.ProductImage;
import com.hometech.hometech.model.ProductVariant;
import com.hometech.hometech.Repository.ProductVariantRepository;
import com.hometech.hometech.service.CategoryService;
import com.hometech.hometech.service.NotifyService;
import com.hometech.hometech.service.ProductImageService;
import com.hometech.hometech.service.ProductService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.*;

@RestController
@RequestMapping("/api/products")
public class ProductRestController {

    private final ProductService productService;
    private final CategoryService categoryService;
    private final ProductImageService productImageService;
    private final NotifyService notifyService;
    private final ProductVariantRepository productVariantRepository;

    public ProductRestController(ProductService productService,
                                 CategoryService categoryService,
                                 ProductImageService productImageService,
                                 NotifyService notifyService,
                                 ProductVariantRepository productVariantRepository) {
        this.productService = productService;
        this.categoryService = categoryService;
        this.productImageService = productImageService;
        this.notifyService = notifyService;
        this.productVariantRepository = productVariantRepository;
    }

    private ResponseEntity<Map<String, Object>> buildResponse(
            boolean success,
            String message,
            Object data,
            String error,
            HttpStatus status
    ) {
        Map<String, Object> res = new HashMap<>();
        res.put("success", success);
        res.put("message", message);
        res.put("data", data);
        res.put("error", error);
        return ResponseEntity.status(status).body(res);
    }

    // 🟢 Lấy tất cả sản phẩm (active) cho người dùng
    @GetMapping
    public ResponseEntity<Map<String, Object>> getAllProducts() {
        List<Product> products = productService.getAllActive();
        return buildResponse(true, "Lấy danh sách sản phẩm đang hiển thị", products, null, HttpStatus.OK);
    }

    // 🟣 Lấy tất cả sản phẩm (bao gồm hidden) cho quản trị
    @GetMapping("/all")
    public ResponseEntity<Map<String, Object>> getAllProductsForAdmin() {
        List<Product> products = productService.getAll();
        return buildResponse(true, "Lấy tất cả sản phẩm thành công", products, null, HttpStatus.OK);
    }

    // 🟢 Lấy sản phẩm theo ID
    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getProductById(@PathVariable long id) {
        Product product = productService.getById(id);

        if (product == null) {
            return buildResponse(false, "Không tìm thấy sản phẩm", null, "Product not found", HttpStatus.NOT_FOUND);
        }

        return buildResponse(true, "Lấy sản phẩm thành công", product, null, HttpStatus.OK);
    }
    @PutMapping("/{id}/toggle")
    public ResponseEntity<Map<String, Object>> toggleProduct(@PathVariable long id) {
        Product toggled = productService.toggleHidden(id);
        if (toggled == null)
            return buildResponse(false, "Không tìm thấy sản phẩm", null, "Product not found", HttpStatus.NOT_FOUND);

        boolean hidden = toggled.isHidden();
        try {
            String statusText = hidden ? "đã được ẩn" : "đã được hiển thị";
            notifyService.notifyAdmins(
                    String.format("Sản phẩm \"%s\" %s", toggled.getName(), statusText),
                    "PRODUCT_TOGGLE",
                    toggled.getId());
        } catch (Exception e) {
            System.err.println("❌ Failed to send product toggle notification: " + e.getMessage());
        }

        return buildResponse(true, "Thay đổi trạng thái thành công", toggled, null, HttpStatus.OK);
    }
    // 🟢 Lấy sản phẩm theo ID danh mục
    @GetMapping("/category/{categoryId}")
    public ResponseEntity<Map<String, Object>> getProductsByCategoryId(@PathVariable int categoryId) {
        List<Product> list = productService.getProductsByCategoryId(categoryId);
        return buildResponse(true, "Lấy sản phẩm theo danh mục thành công", list, null, HttpStatus.OK);
    }

    // 🟢 Lấy sản phẩm đang active theo danh mục
    @GetMapping("/category/{categoryId}/active")
    public ResponseEntity<Map<String, Object>> getActiveProductsByCategoryId(@PathVariable long categoryId) {
        List<Product> list = productService.getActiveProductsByCategoryId(categoryId);
        return buildResponse(true, "Lấy sản phẩm active theo danh mục thành công", list, null, HttpStatus.OK);
    }

    // 🟢 Tạo sản phẩm mới
    @PostMapping
    public ResponseEntity<Map<String, Object>> createProduct(@RequestBody Product product) {

        // Kiểm tra category
        if (product.getCategory() != null && product.getCategory().getId() != null) {

            Category category = categoryService.getById(product.getCategory().getId());

            if (category == null) {
                return buildResponse(false, "Category không tồn tại", null, "Invalid category", HttpStatus.BAD_REQUEST);
            }

            product.setCategory(category);
        }

        Product saved = productService.save(product);

        try {
            notifyService.notifyAdmins(
                    String.format("Sản phẩm \"%s\" đã được thêm mới", saved.getName()),
                    "PRODUCT_CREATED",
                    saved.getId());
        } catch (Exception e) {
            System.err.println("❌ Failed to send product create notification: " + e.getMessage());
        }

        return buildResponse(true, "Thêm sản phẩm thành công", saved, null, HttpStatus.OK);
    }

    // 🟢 Cập nhật sản phẩm
    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> updateProduct(@PathVariable long id, @RequestBody Product product) {

        Product existing = productService.getById(id);

        if (existing == null) {
            return buildResponse(false, "Không tìm thấy sản phẩm", null, "Product not found", HttpStatus.NOT_FOUND);
        }

        // Copy các trường cần update từ request body sang existing
        existing.setName(product.getName());
        existing.setPrice(product.getPrice());
        existing.setStock(product.getStock());
        existing.setDescription(product.getDescription());
        existing.setHidden(product.isHidden());

        // Xử lý attributeValues: xóa tất cả cũ, rồi thêm mới (vì orphanRemoval=true)
        if (existing.getAttributeValues() == null) {
            existing.setAttributeValues(new ArrayList<>());
        } else {
            existing.getAttributeValues().clear();
        }
        if (product.getAttributeValues() != null && !product.getAttributeValues().isEmpty()) {
            for (ProductAttributeValue av : product.getAttributeValues()) {
                av.setProduct(existing);
                existing.getAttributeValues().add(av);
            }
        }

        // Xử lý variants: giữ lại ID cũ để ảnh theo biến thể không bị mất liên kết.
        if (existing.getVariants() == null) {
            existing.setVariants(new ArrayList<>());
        }

        Map<Long, ProductVariant> currentVariantsById = new HashMap<>();
        for (ProductVariant currentVariant : existing.getVariants()) {
            if (currentVariant.getId() != null) {
                currentVariantsById.put(currentVariant.getId(), currentVariant);
            }
        }

        Set<Long> requestedExistingVariantIds = new HashSet<>();
        if (product.getVariants() != null) {
            for (ProductVariant requestedVariant : product.getVariants()) {
                if (requestedVariant.getId() != null) {
                    if (!currentVariantsById.containsKey(requestedVariant.getId())) {
                        return buildResponse(false, "Biến thể không thuộc sản phẩm", null, "Invalid variant", HttpStatus.BAD_REQUEST);
                    }
                    requestedExistingVariantIds.add(requestedVariant.getId());
                }
            }
        }

        Iterator<ProductVariant> variantIterator = existing.getVariants().iterator();
        while (variantIterator.hasNext()) {
            ProductVariant currentVariant = variantIterator.next();
            if (currentVariant.getId() != null && !requestedExistingVariantIds.contains(currentVariant.getId())) {
                productImageService.detachImagesFromVariant(currentVariant.getId());
                variantIterator.remove();
            }
        }

        if (product.getVariants() != null && !product.getVariants().isEmpty()) {
            for (ProductVariant requestedVariant : product.getVariants()) {
                String variantName = requestedVariant.getName() != null ? requestedVariant.getName().trim() : "";
                if (variantName.isEmpty()) {
                    continue;
                }

                ProductVariant targetVariant;
                if (requestedVariant.getId() != null) {
                    targetVariant = currentVariantsById.get(requestedVariant.getId());
                } else {
                    targetVariant = new ProductVariant();
                    targetVariant.setProduct(existing);
                    existing.getVariants().add(targetVariant);
                }

                targetVariant.setName(variantName);
                targetVariant.setStock(requestedVariant.getStock());
            }
        }

        // Xử lý category nếu có thay đổi
        if (product.getCategory() != null && product.getCategory().getId() != null) {
            Category category = categoryService.getById(product.getCategory().getId());
            if (category == null) {
                return buildResponse(false, "Category không tồn tại", null, "Invalid category", HttpStatus.BAD_REQUEST);
            }
            existing.setCategory(category);
        }

        // Save existing (giữ nguyên images cũ)
        Product updated = productService.save(existing);

        try {
            notifyService.notifyAdmins(
                    String.format("Sản phẩm \"%s\" đã được cập nhật", updated.getName()),
                    "PRODUCT_UPDATED",
                    updated.getId());
        } catch (Exception e) {
            System.err.println("❌ Failed to send product update notification: " + e.getMessage());
        }

        return buildResponse(true, "Cập nhật sản phẩm thành công", updated, null, HttpStatus.OK);
    }

    // 🟢 Lấy thông tin danh mục và thống kê
    @GetMapping("/category/{categoryId}/info")
    public ResponseEntity<Map<String, Object>> getCategoryInfo(@PathVariable long categoryId) {

        Category category = categoryService.getById(categoryId);

        if (category == null) {
            return buildResponse(false, "Không tìm thấy danh mục", null, "Category not found", HttpStatus.NOT_FOUND);
        }

        long total = categoryService.countProductsInCategory(categoryId);
        long active = categoryService.countActiveProductsInCategory(categoryId);

        Map<String, Object> info = Map.of(
                "category", category,
                "totalProducts", total,
                "activeProducts", active
        );

        return buildResponse(true, "Lấy thông tin danh mục thành công", info, null, HttpStatus.OK);
    }
    @GetMapping("/search")
    public ResponseEntity<Map<String, Object>> search(@RequestParam String keyword) {
        return buildResponse(true, "Tìm kiếm thành công",
                productService.searchByName(keyword), null, HttpStatus.OK);
    }
    @GetMapping("/sort/price/asc")
    public ResponseEntity<Map<String, Object>> sortPriceAsc() {
        return buildResponse(true, "Sắp xếp theo giá tăng dần",
                productService.sortByPriceAsc(), null, HttpStatus.OK);
    }
    @GetMapping("/sort/price/desc")
    public ResponseEntity<Map<String, Object>> sortPriceDesc() {
        return buildResponse(true, "Sắp xếp theo giá giảm dần",
                productService.sortByPriceDesc(), null, HttpStatus.OK);
    }

    @GetMapping("/sort/sold/asc")
    public ResponseEntity<Map<String, Object>> sortSoldAsc() {
        return buildResponse(true, "Sắp xếp theo lượt bán tăng",
                productService.sortBySoldAsc(), null, HttpStatus.OK);
    }

    @GetMapping("/sort/sold/desc")
    public ResponseEntity<Map<String, Object>> sortSoldDesc() {
        return buildResponse(true, "Sắp xếp theo lượt bán giảm",
                productService.sortBySoldDesc(), null, HttpStatus.OK);
    }

    @GetMapping("/newest")
    public ResponseEntity<Map<String, Object>> getNewest() {
        return buildResponse(true, "Lấy sản phẩm mới nhất",
                productService.sortByNewest(), null, HttpStatus.OK);
    }

    @GetMapping("/top-selling")
    public ResponseEntity<Map<String, Object>> getTopSelling() {
        return buildResponse(true, "Top 10 bán chạy",
                productService.getTop10BestSellingProducts(), null, HttpStatus.OK);
    }

    @GetMapping("/last-7-days")
    public ResponseEntity<Map<String, Object>> getLast7Days() {
        return buildResponse(true, "Sản phẩm trong 7 ngày gần đây",
                productService.getProductsAddedInLast7Days(), null, HttpStatus.OK);
    }

//    IMAGE
    @PostMapping("/{productId}/images")
    public ResponseEntity<Map<String, Object>> uploadImages(
            @PathVariable Long productId,
            @RequestParam(value = "variantId", required = false) Long variantId,
            @RequestParam("files") MultipartFile[] files)
    {
        try {
            List<ProductImage> images = productImageService.uploadImages(productId, variantId, files);

            List<ProductImageDTO> imageDTOs = images.stream()
                    .map(ProductImageDTO::new)
                    .toList();

            return buildResponse(true, "Upload ảnh thành công", imageDTOs, null, HttpStatus.OK);

        } catch (Exception e) {
            return buildResponse(false, "Lỗi upload ảnh", null, e.getMessage(), HttpStatus.BAD_REQUEST);
        }
    }


    @GetMapping("/{productId}/images")
    public ResponseEntity<Map<String, Object>> getImages(@PathVariable Long productId) {
        List<ProductImage> images = productImageService.getImages(productId);
        // Convert ProductImage to DTO với base64 string
        List<ProductImageDTO> imageDTOs = images.stream()
                .map(ProductImageDTO::new)
                .toList();
        return buildResponse(true, "Lấy danh sách ảnh thành công", imageDTOs, null, HttpStatus.OK);
    }

    @DeleteMapping("/images/{imageId}")
    public ResponseEntity<Map<String, Object>> deleteImage(@PathVariable Long imageId) {
        try {
            productImageService.deleteImage(imageId);
            return buildResponse(true, "Xóa ảnh thành công", null, null, HttpStatus.OK);
        } catch (Exception e) {
            return buildResponse(false, "Không tìm thấy ảnh", null, e.getMessage(), HttpStatus.NOT_FOUND);
        }
    }

    @PutMapping("/images/{imageId}/display-order")
    public ResponseEntity<Map<String, Object>> updateImageDisplayOrder(
            @PathVariable Long imageId,
            @RequestBody Map<String, Integer> request) {
        try {
            Integer displayOrder = request.get("displayOrder");
            if (displayOrder == null) {
                return buildResponse(false, "displayOrder là bắt buộc", null, "displayOrder is required", HttpStatus.BAD_REQUEST);
            }
            ProductImage image = productImageService.updateDisplayOrder(imageId, displayOrder);
            ProductImageDTO imageDTO = new ProductImageDTO(image);
            return buildResponse(true, "Cập nhật thứ tự hiển thị thành công", imageDTO, null, HttpStatus.OK);
        } catch (Exception e) {
            return buildResponse(false, "Lỗi cập nhật thứ tự hiển thị", null, e.getMessage(), HttpStatus.BAD_REQUEST);
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> deleteProduct(@PathVariable long id) {
        Product product = productService.getById(id);
        if (product == null) {
            return buildResponse(false, "Không tìm thấy sản phẩm", null, "Product not found", HttpStatus.NOT_FOUND);
        }

        boolean deleted = productService.deleteById(id);
        if (!deleted) {
            return buildResponse(false, "Không thể xóa sản phẩm", null, "Delete failed", HttpStatus.BAD_REQUEST);
        }

        try {
            notifyService.notifyAdmins(
                    String.format("Sản phẩm \"%s\" đã bị xóa", product.getName()),
                    "PRODUCT_DELETED",
                    product.getId());
        } catch (Exception e) {
            System.err.println("❌ Failed to send product delete notification: " + e.getMessage());
        }

        return buildResponse(true, "Xóa sản phẩm thành công", null, null, HttpStatus.OK);
    }

    // 🟢 Lấy danh sách biến thể của sản phẩm
    @GetMapping("/{productId}/variants")
    public ResponseEntity<Map<String, Object>> getProductVariants(@PathVariable Long productId) {
        List<ProductVariant> variants = productVariantRepository.findByProduct_Id(productId);
        return buildResponse(true, "Lấy danh sách biến thể thành công", variants, null, HttpStatus.OK);
    }


}
