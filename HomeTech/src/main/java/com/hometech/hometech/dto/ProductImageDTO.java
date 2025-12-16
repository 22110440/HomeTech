package com.hometech.hometech.dto;

import com.hometech.hometech.model.ProductImage;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.Base64;

@Data
@NoArgsConstructor
public class ProductImageDTO {
    private Long id;
    private String fileName;
    private String imageData; // Base64 string
    private Integer displayOrder; // số thứ tự hiển thị

    public ProductImageDTO(ProductImage productImage) {
        this.id = productImage.getId();
        this.fileName = productImage.getFileName();
        this.displayOrder = productImage.getDisplayOrder() != null ? productImage.getDisplayOrder() : 0;
        if (productImage.getImageData() != null) {
            this.imageData = Base64.getEncoder().encodeToString(productImage.getImageData());
        }
    }
}

