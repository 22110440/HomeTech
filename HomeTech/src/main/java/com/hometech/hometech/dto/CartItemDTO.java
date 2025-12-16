package com.hometech.hometech.dto;

import com.hometech.hometech.model.CartItem;
import com.hometech.hometech.model.Product;
import com.hometech.hometech.model.ProductVariant;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class CartItemDTO {
    private Long id;
    private int quantity;
    private Product product;
    private ProductVariant variant;

    public CartItemDTO(CartItem cartItem) {
        this.id = cartItem.getId();
        this.quantity = cartItem.getQuantity();
        // Load product explicitly to avoid lazy loading issues
        if (cartItem.getProduct() != null) {
            this.product = cartItem.getProduct();
        }
        // Load variant if exists
        if (cartItem.getVariant() != null) {
            this.variant = cartItem.getVariant();
        }
    }
}

