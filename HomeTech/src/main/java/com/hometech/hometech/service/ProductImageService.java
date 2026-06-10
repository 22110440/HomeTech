package com.hometech.hometech.service;

import com.hometech.hometech.Repository.ProductImageRepository;
import com.hometech.hometech.Repository.ProductRepository;
import com.hometech.hometech.Repository.ProductVariantRepository;
import com.hometech.hometech.model.Product;
import com.hometech.hometech.model.ProductImage;
import com.hometech.hometech.model.ProductVariant;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.List;

@Service
public class ProductImageService {

    public ProductImageService(ProductRepository productRepository,
                               ProductImageRepository productImageRepository,
                               ProductVariantRepository productVariantRepository) {
        this.productRepository = productRepository;
        this.productImageRepository = productImageRepository;
        this.productVariantRepository = productVariantRepository;
    }

    private final ProductRepository productRepository;
    private final ProductImageRepository productImageRepository;
    private final ProductVariantRepository productVariantRepository;

    public List<ProductImage> uploadImages(Long productId, MultipartFile[] files) {
        return uploadImages(productId, null, files);
    }

    public List<ProductImage> uploadImages(Long productId, Long variantId, MultipartFile[] files) {

        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy sản phẩm"));

        ProductVariant variant = null;
        if (variantId != null) {
            variant = productVariantRepository.findByIdAndProduct_Id(variantId, productId)
                    .orElseThrow(() -> new RuntimeException("Biến thể không thuộc sản phẩm này"));
        }

        // Lấy số lượng ảnh hiện có để đặt displayOrder cho ảnh mới
        List<ProductImage> existingImages = productImageRepository
                .findByProductAndOptionalVariantOrderByDisplayOrderAsc(productId, variantId);
        int nextOrder = existingImages.isEmpty() ? 0 : 
            existingImages.stream()
                .mapToInt(img -> img.getDisplayOrder() != null ? img.getDisplayOrder() : 0)
                .max()
                .orElse(0) + 1;

        List<ProductImage> images = new ArrayList<>();

        try {
            for (MultipartFile file : files) {
                ProductImage img = new ProductImage();
                img.setFileName(file.getOriginalFilename());
                img.setImageData(file.getBytes());
                img.setProduct(product);
                img.setVariant(variant);
                img.setDisplayOrder(nextOrder++);

                images.add(img);
            }

            return productImageRepository.saveAll(images);

        } catch (Exception e) {
            throw new RuntimeException("Lỗi upload ảnh: " + e.getMessage());
        }
    }


    public List<ProductImage> getImages(Long productId) {
        return productImageRepository.findByProduct_IdOrderByDisplayOrderAsc(productId);
    }

    public ProductImage updateDisplayOrder(Long imageId, Integer displayOrder) {
        ProductImage image = productImageRepository.findById(imageId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy ảnh"));
        image.setDisplayOrder(displayOrder);
        return productImageRepository.save(image);
    }

    public void detachImagesFromVariant(Long variantId) {
        if (variantId == null) {
            return;
        }

        List<ProductImage> images = productImageRepository.findByVariant_Id(variantId);
        if (images.isEmpty()) {
            return;
        }

        for (ProductImage image : images) {
            image.setVariant(null);
        }
        productImageRepository.saveAll(images);
    }

    public void deleteImage(Long id) {
        if (!productImageRepository.existsById(id)) {
            throw new RuntimeException("Không tìm thấy ảnh");
        }
        productImageRepository.deleteById(id);
    }
}
