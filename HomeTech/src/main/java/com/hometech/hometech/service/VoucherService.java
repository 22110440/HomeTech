package com.hometech.hometech.service;

import com.hometech.hometech.Repository.VoucherRepository;
import com.hometech.hometech.model.Voucher;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class VoucherService {

    private final VoucherRepository voucherRepository;

    public VoucherService(VoucherRepository voucherRepository) {
        this.voucherRepository = voucherRepository;
    }


    public Voucher create(Voucher voucher) {
        if (voucher.getUsedCount() == null || voucher.getUsedCount() < 0) {
            voucher.setUsedCount(0);
        }
        return voucherRepository.save(voucher);
    }

    public Voucher update(Long id, Voucher updated) {
        Voucher voucher = voucherRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Voucher not found"));

        voucher.setCode(updated.getCode());
        voucher.setDiscountPercent(updated.getDiscountPercent());
        voucher.setDiscountAmount(updated.getDiscountAmount());
        voucher.setMinOrderValue(updated.getMinOrderValue());
        voucher.setUsageLimit(updated.getUsageLimit());
        voucher.setStartDate(updated.getStartDate());
        voucher.setEndDate(updated.getEndDate());
        voucher.setActive(updated.isActive());
        if (updated.getUsedCount() != null && updated.getUsedCount() >= 0) {
            voucher.setUsedCount(updated.getUsedCount());
        }

        return voucherRepository.save(voucher);
    }

    public void delete(Long id) {
        voucherRepository.deleteById(id);
    }

    public List<Voucher> getAll() {
        return voucherRepository.findAll();
    }

    public Voucher getByCode(String code) {
        return voucherRepository.findByCode(code)
                .orElseThrow(() -> new RuntimeException("Voucher không tồn tại"));
    }

    // ===================== APPLY VOUCHER =========================
    public double applyVoucher(String code, double orderTotal) {
        Voucher voucher = getByCode(code);

        // Check active
        if (!voucher.isActive()) {
            throw new RuntimeException("Voucher đã bị khóa");
        }

        // Check date
        LocalDateTime now = LocalDateTime.now();
        if (now.isBefore(voucher.getStartDate()) || now.isAfter(voucher.getEndDate())) {
            throw new RuntimeException("Voucher đã hết hạn");
        }

        // Check usage limit
        if (voucher.getUsedCount() >= voucher.getUsageLimit()) {
            throw new RuntimeException("Voucher đã đạt số lần sử dụng tối đa");
        }

        // Check minimum order value
        if (orderTotal < voucher.getMinOrderValue()) {
            throw new RuntimeException("Đơn hàng chưa đạt đủ điều kiện áp dụng");
        }

        // Calculate discount
        double discount = 0;

        if (voucher.getDiscountPercent() != null) {
            discount = orderTotal * (voucher.getDiscountPercent() / 100);
        }

        if (voucher.getDiscountAmount() != null) {
            discount += voucher.getDiscountAmount();
        }

        // Ensure discount không vượt quá tổng đơn
        discount = Math.min(discount, orderTotal);

        // Increase usedCount after successful apply
        voucher.setUsedCount(voucher.getUsedCount() + 1);
        voucherRepository.save(voucher);

        return orderTotal - discount;
    }
}