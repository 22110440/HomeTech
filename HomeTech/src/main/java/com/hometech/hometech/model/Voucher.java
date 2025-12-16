package com.hometech.hometech.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

@Entity
@NoArgsConstructor
@AllArgsConstructor
public class Voucher {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Mã voucher (VD: SALE10, FREESHIP...)
    @Column(unique = true, nullable = false)
    private String code;

    public LocalDateTime getStartDate() {
        return startDate;
    }

    public void setStartDate(LocalDateTime startDate) {
        this.startDate = startDate;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public Double getDiscountPercent() {
        return discountPercent;
    }

    public void setDiscountPercent(Double discountPercent) {
        this.discountPercent = discountPercent;
    }

    public Double getDiscountAmount() {
        return discountAmount;
    }

    public void setDiscountAmount(Double discountAmount) {
        this.discountAmount = discountAmount;
    }

    public Double getMinOrderValue() {
        return minOrderValue;
    }

    public void setMinOrderValue(Double minOrderValue) {
        this.minOrderValue = minOrderValue;
    }

    public Integer getUsageLimit() {
        return usageLimit;
    }

    public void setUsageLimit(Integer usageLimit) {
        this.usageLimit = usageLimit;
    }

    public Integer getUsedCount() {
        return usedCount;
    }

    public void setUsedCount(Integer usedCount) {
        this.usedCount = usedCount;
    }

    public LocalDateTime getEndDate() {
        return endDate;
    }

    public void setEndDate(LocalDateTime endDate) {
        this.endDate = endDate;
    }

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }

    public List<Order> getOrders() {
        return orders;
    }

    public void setOrders(List<Order> orders) {
        this.orders = orders;
    }

    // Ví dụ: 10%, 20% -> giảm %
    private Double discountPercent;

    // Giảm trực tiếp  (VD: 50.000đ)
    private Double discountAmount;

    // Giá trị đơn hàng tối thiểu để áp dụng
    private Double minOrderValue;

    // Số lần được dùng tổng cộng
    private Integer usageLimit;

    // Số lần đã dùng (tự tăng sau khi Order dùng voucher)
    private Integer usedCount = 0;

    private LocalDateTime startDate;
    private LocalDateTime endDate;

    private boolean active = true;

    // Một voucher có thể được dùng trong nhiều đơn hàng
    @OneToMany(mappedBy = "voucher", fetch = FetchType.LAZY)
    private List<Order> orders;
}
