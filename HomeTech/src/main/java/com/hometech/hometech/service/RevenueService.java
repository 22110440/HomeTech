package com.hometech.hometech.service;

import com.hometech.hometech.Repository.OrderRepository;
import com.hometech.hometech.enums.OrderStatus;
import com.hometech.hometech.model.Order;
import com.hometech.hometech.model.OrderItem;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.IsoFields;
import java.time.temporal.TemporalAdjusters;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class RevenueService {
    private final OrderRepository orderRepository;

    public RevenueService(OrderRepository orderRepository) {
        this.orderRepository = orderRepository;
    }

    /**
     * Get revenue statistics with grouping and filtering
     */
    @Transactional(readOnly = true)
    public Map<String, Object> getRevenueStats(
            LocalDate startDate,
            LocalDate endDate,
            String groupBy,
            Long categoryId,
            Long productId
    ) {
        LocalDateTime startDateTime = startDate.atStartOfDay();
        LocalDateTime endDateTime = endDate.atTime(23, 59, 59);

        // Get all orders (except CANCELLED) in date range
        List<Order> orders = getOrdersInRange(startDateTime, endDateTime);

        // Filter by category or product if specified
        if (categoryId != null || productId != null) {
            orders = orders.stream()
                    .filter(order -> hasMatchingItems(order, categoryId, productId))
                    .collect(Collectors.toList());
        }

        // Calculate total revenue
        double totalRevenue = calculateTotalRevenue(orders, categoryId, productId);
        
        // Group revenue by time period
        List<Map<String, Object>> groupedData = groupRevenueByPeriod(orders, groupBy, categoryId, productId);

        Map<String, Object> result = new HashMap<>();
        result.put("totalRevenue", totalRevenue);
        result.put("orderCount", orders.size());
        result.put("averageOrderValue", orders.isEmpty() ? 0 : totalRevenue / orders.size());
        result.put("groupedData", groupedData);
        
        return result;
    }

    /**
     * Get top 5 products by revenue
     */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getTopProducts(
            LocalDate startDate,
            LocalDate endDate,
            Long categoryId
    ) {
        LocalDateTime startDateTime = startDate.atStartOfDay();
        LocalDateTime endDateTime = endDate.atTime(23, 59, 59);

        // Get all orders (except CANCELLED) in date range
        List<Order> orders = getOrdersInRange(startDateTime, endDateTime);

        // Collect all order items
        Map<Long, ProductRevenue> productRevenueMap = new HashMap<>();
        
        for (Order order : orders) {
            if (order.getItems() != null) {
                for (OrderItem item : order.getItems()) {
                    if (item.getProduct() != null) {
                        // Filter by category if specified
                        if (!matchesCategory(item, categoryId)) {
                            continue;
                        }

                        Long productId = item.getProduct().getId();
                        double itemRevenue = item.getPrice() * item.getQuantity();
                        
                        productRevenueMap.computeIfAbsent(productId, k -> 
                            new ProductRevenue(
                                productId,
                                item.getProduct().getName(),
                                item.getProduct().getCategory() != null ? 
                                    item.getProduct().getCategory().getName() : "N/A",
                                0.0,
                                0
                            )
                        ).addRevenue(itemRevenue, item.getQuantity());
                    }
                }
            }
        }

        // Sort by revenue and get top 5
        return productRevenueMap.values().stream()
                .sorted((a, b) -> Double.compare(b.revenue, a.revenue))
                .limit(5)
                .map(pr -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("productId", pr.productId);
                    map.put("productName", pr.productName);
                    map.put("categoryName", pr.categoryName);
                    map.put("revenue", pr.revenue);
                    map.put("quantitySold", pr.quantitySold);
                    return map;
                })
                .collect(Collectors.toList());
    }

    // Helper methods

    private List<Order> getOrdersInRange(LocalDateTime startDateTime, LocalDateTime endDateTime) {
        return orderRepository.findAllWithRevenueRelations().stream()
                .filter(order -> order.getStatus() != OrderStatus.CANCELLED)
                .filter(order -> order.getCreatedAt() != null &&
                        !order.getCreatedAt().isBefore(startDateTime) &&
                        !order.getCreatedAt().isAfter(endDateTime))
                .collect(Collectors.toList());
    }

    private boolean hasMatchingItems(Order order, Long categoryId, Long productId) {
        if (order.getItems() == null) return false;
        
        return order.getItems().stream().anyMatch(item -> {
            if (item.getProduct() == null) return false;
            
            return matchesProduct(item, productId) && matchesCategory(item, categoryId);
        });
    }

    private double calculateTotalRevenue(List<Order> orders, Long categoryId, Long productId) {
        double total = 0.0;
        
        for (Order order : orders) {
            if (order.getItems() == null) continue;
            
            for (OrderItem item : order.getItems()) {
                if (item.getProduct() == null) continue;
                
                // Apply filters
                if (!matchesProduct(item, productId)) {
                    continue;
                }
                
                if (!matchesCategory(item, categoryId)) {
                    continue;
                }
                
                total += item.getPrice() * item.getQuantity();
            }
        }
        
        return total;
    }

    private List<Map<String, Object>> groupRevenueByPeriod(
            List<Order> orders,
            String groupBy,
            Long categoryId,
            Long productId
    ) {
        Map<String, Double> periodRevenue = new TreeMap<>();
        
        for (Order order : orders) {
            if (order.getCreatedAt() == null || order.getItems() == null) continue;
            
            String periodKey = getPeriodKey(order.getCreatedAt(), groupBy);
            double orderRevenue = 0.0;
            
            for (OrderItem item : order.getItems()) {
                if (item.getProduct() == null) continue;
                
                // Apply filters
                if (!matchesProduct(item, productId)) {
                    continue;
                }
                
                if (!matchesCategory(item, categoryId)) {
                    continue;
                }
                
                orderRevenue += item.getPrice() * item.getQuantity();
            }
            
            periodRevenue.merge(periodKey, orderRevenue, Double::sum);
        }
        
        return periodRevenue.entrySet().stream()
                .map(entry -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("period", entry.getKey());
                    map.put("revenue", entry.getValue());
                    return map;
                })
                .collect(Collectors.toList());
    }

    private String getPeriodKey(LocalDateTime dateTime, String groupBy) {
        LocalDate date = dateTime.toLocalDate();
        
        switch (groupBy.toUpperCase()) {
            case "DAY":
                return date.toString(); // yyyy-MM-dd
                
            case "WEEK":
                LocalDate weekStart = date.with(TemporalAdjusters.previousOrSame(java.time.DayOfWeek.MONDAY));
                return weekStart.toString();
                
            case "MONTH":
                return String.format("%d-%02d", date.getYear(), date.getMonthValue());
                
            case "QUARTER":
                int quarter = date.get(IsoFields.QUARTER_OF_YEAR);
                return String.format("%d-Q%d", date.getYear(), quarter);
                
            case "YEAR":
                return String.valueOf(date.getYear());
                
            default:
                return date.toString();
        }
    }

    private boolean matchesProduct(OrderItem item, Long productId) {
        if (productId == null) {
            return true;
        }
        return item.getProduct() != null
                && item.getProduct().getId() != null
                && item.getProduct().getId().equals(productId);
    }

    private boolean matchesCategory(OrderItem item, Long categoryId) {
        if (categoryId == null) {
            return true;
        }
        return item.getProduct() != null
                && item.getProduct().getCategory() != null
                && item.getProduct().getCategory().getId() != null
                && item.getProduct().getCategory().getId().equals(categoryId);
    }

    // Inner class for product revenue tracking
    private static class ProductRevenue {
        Long productId;
        String productName;
        String categoryName;
        double revenue;
        int quantitySold;

        ProductRevenue(Long productId, String productName, String categoryName, double revenue, int quantitySold) {
            this.productId = productId;
            this.productName = productName;
            this.categoryName = categoryName;
            this.revenue = revenue;
            this.quantitySold = quantitySold;
        }

        void addRevenue(double amount, int quantity) {
            this.revenue += amount;
            this.quantitySold += quantity;
        }
    }
}
