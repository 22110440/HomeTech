package com.hometech.hometech.model;


import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.List;

@Entity
@AllArgsConstructor
@NoArgsConstructor
@Getter
@Setter
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int productID;

    private String productName;
    private double price;

    @Lob
    private byte[] image;

    private String color;
    private int size;
    private boolean status;
    private String description;

    @OneToOne(mappedBy = "product", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private Review review;

    @OneToMany(mappedBy = "product") // tham chieu den "product" trong cardItem
    private List<CartItem> orders;

    @OneToMany(mappedBy = "product", fetch = FetchType.LAZY)
    private List<OrderItem> orderItems;

    private LocalDateTime createDate;

    @ManyToOne
    @JoinColumn(name = "categoryID", nullable = true)
    private Category category;

    public int getProductID() { return productID; }
    public void setProductID(int productID) { this.productID = productID; }
    public String getProductName() { return productName; }
    public void setProductName(String productName) { this.productName = productName; }
    public double getPrice() { return price; }
    public void setPrice(double price) { this.price = price; }
    public byte[] getImage() { return image; }
    public void setImage(byte[] image) { this.image = image; }
    public String getColor() { return color; }
    public void setColor(String color) { this.color = color; }
    public int getSize() { return size; }
    public void setSize(int size) { this.size = size; }
    public boolean isStatus() { return status; }
    public void setStatus(boolean status) { this.status = status; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public Review getReview() { return review; }
    public void setReview(Review review) { this.review = review; }
    public List<CartItem> getOrders() { return orders; }
    public void setOrders(List<CartItem> orders) { this.orders = orders; }
    public List<OrderItem> getOrderItems() { return orderItems; }
    public void setOrderItems(List<OrderItem> orderItems) { this.orderItems = orderItems; }
    public LocalDateTime getCreateDate() { return createDate; }
    public void setCreateDate(LocalDateTime createDate) { this.createDate = createDate; }
    public Category getCategory() { return category; }
    public void setCategory(Category category) { this.category = category; }
}
