package com.hometech.hometech.model;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
public class CartItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int cartItemId;

    // Quan hệ ManyToOne với Cart
    @ManyToOne
    @JoinColumn(name = "cart_id")
    private Cart cart;

    // Quan hệ ManyToOne với Product
    @ManyToOne
    @JoinColumn(name = "product_id")
    private Product product;

    private int quantity;
}