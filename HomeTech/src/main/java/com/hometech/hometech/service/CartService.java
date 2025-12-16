package com.hometech.hometech.service;

import com.hometech.hometech.Repository.CartItemRepository;
import com.hometech.hometech.Repository.CustomerRepository;
import com.hometech.hometech.Repository.ProductRepository;
import com.hometech.hometech.Repository.ProductVariantRepository;
import com.hometech.hometech.model.Cart;
import com.hometech.hometech.model.CartItem;
import com.hometech.hometech.model.Customer;
import com.hometech.hometech.model.Product;
import com.hometech.hometech.model.ProductVariant;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

@Service
@Transactional
public class CartService {

    private final CartItemRepository cartRepo;
    private final ProductRepository productRepo;
    private final CustomerRepository customerRepo;
    private final NotifyService notifyService;
    private final ProductVariantRepository productVariantRepository;

    public CartService(CartItemRepository cartRepo,
                       ProductRepository productRepo,
                       CustomerRepository customerRepo,
                       NotifyService notifyService,
                       ProductVariantRepository productVariantRepository) {
        this.cartRepo = cartRepo;
        this.productRepo = productRepo;
        this.customerRepo = customerRepo;
        this.notifyService = notifyService;
        this.productVariantRepository = productVariantRepository;
    }

    // Lấy customer theo userId hoặc ném ngoại lệ
    private Customer getCustomerByUserIdOrThrow(Long userId) {
        // Customer extends User, nên Customer ID = User ID
        Optional<Customer> opt = customerRepo.findById(userId);
        if (opt.isPresent()) {
            return opt.get();
        }
        throw new RuntimeException("Customer not found for userId=" + userId);
    }

    // ===== Utility: đảm bảo customer có cart, tạo nếu chưa có =====
    private void ensureCustomerHasCart(Customer customer) {
        if (customer.getCart() == null) {
            Cart newCart = new Cart();
            newCart.setCustomer(customer);
            customer.setCart(newCart);
            // lưu customer để cascade tạo cart (cần đảm bảo Customer entity cascade ALL cho Cart)
            customerRepo.save(customer);
        }
    }

    // Xóa các item không hợp lệ (sản phẩm ẩn/hết hàng hoặc số lượng <= 0)
    private List<CartItem> cleanupCartItems(Cart cart) {
        if (cart == null) {
            return List.of();
        }

        List<CartItem> items = new ArrayList<>(cartRepo.findByCart(cart));
        boolean mutated = false;

        for (CartItem item : items) {
            Product product = item.getProduct();
            boolean invalidProduct = (product == null) || product.isHidden() || product.getStock() <= 0;
            boolean invalidQuantity = item.getQuantity() <= 0;

            if (invalidProduct || invalidQuantity) {
                cartRepo.delete(item);
                mutated = true;
            }
        }

        return mutated ? cartRepo.findByCart(cart) : items;
    }

    private void validateProductAvailability(Product product) {
        if (product.isHidden()) {
            throw new RuntimeException("Sản phẩm đã bị ẩn, không thể thêm vào giỏ hàng");
        }
        if (product.getStock() <= 0) {
            throw new RuntimeException("Sản phẩm đã hết hàng");
        }
    }

    private int ensureQuantityWithinStock(int requestedQuantity, Product product) {
        if (requestedQuantity <= 0) {
            throw new RuntimeException("Số lượng phải lớn hơn 0");
        }

        if (requestedQuantity > product.getStock()) {
            throw new RuntimeException("Số lượng vượt quá tồn kho");
        }

        return requestedQuantity;
    }

    // ===== Public APIs =====

    // Xem tất cả items (admin)
    public List<CartItem> getAllItems() {
        return cartRepo.findAll();
    }

    // Lấy giỏ hàng theo user (login)
    public List<CartItem> getCartItemsByUserId(Long userId) {
        Customer customer = getCustomerByUserIdOrThrow(userId);
        if (customer.getCart() == null) return List.of();
        // findByCart with @EntityGraph will eagerly load product
        return cleanupCartItems(customer.getCart());
    }


    // Thêm sản phẩm vào giỏ của user
    public CartItem addProduct(long userId, long productId, int quantity, Long variantId) {
        Customer customer = getCustomerByUserIdOrThrow(userId);

        Product product = productRepo.findById(productId)
                .orElseThrow(() -> new RuntimeException("Product not found with id=" + productId));

        ProductVariant variant = null;
        if (variantId != null) {
            variant = productVariantRepository.findById(variantId)
                    .orElseThrow(() -> new RuntimeException("Variant not found with id=" + variantId));
            // Kiểm tra variant thuộc về product này
            if (!Objects.equals(variant.getProduct().getId(), productId)) {
                throw new RuntimeException("Variant does not belong to this product");
            }
            // Kiểm tra stock của variant
            if (variant.getStock() <= 0) {
                throw new RuntimeException("Biến thể đã hết hàng");
            }
            if (quantity > variant.getStock()) {
                throw new RuntimeException("Số lượng vượt quá tồn kho của biến thể");
            }
        } else {
            validateProductAvailability(product);
            if (quantity > product.getStock()) {
                throw new RuntimeException("Số lượng vượt quá tồn kho");
            }
        }

        // ensure cart exists
        ensureCustomerHasCart(customer);

        // tìm item có cùng product id và variant id trong cùng cart
        List<CartItem> existingItems = cartRepo.findByCart(customer.getCart());
        final ProductVariant finalVariant = variant;
        Optional<CartItem> existingItem = existingItems.stream()
                .filter(item -> {
                    if (item.getProduct() == null || !Objects.equals(item.getProduct().getId(), productId)) {
                        return false;
                    }
                    // So sánh variant: cả hai đều null hoặc cả hai đều có cùng id
                    Long itemVariantId = item.getVariant() != null ? item.getVariant().getId() : null;
                    Long requestVariantId = finalVariant != null ? finalVariant.getId() : null;
                    return Objects.equals(itemVariantId, requestVariantId);
                })
                .findFirst();

        CartItem savedItem;
        if (existingItem.isPresent()) {
            CartItem item = existingItem.get();
            int currentQuantity = item.getQuantity();
            int newQuantity = currentQuantity + quantity;
            
            // Kiểm tra stock
            if (finalVariant != null) {
                if (newQuantity > finalVariant.getStock()) {
                    throw new RuntimeException("Số lượng vượt quá tồn kho của biến thể");
                }
            } else {
                newQuantity = ensureQuantityWithinStock(newQuantity, product);
            }
            
            item.setQuantity(newQuantity);
            savedItem = cartRepo.save(item);
        } else {
            CartItem newItem = new CartItem();
            newItem.setProduct(product);
            newItem.setVariant(finalVariant);
            newItem.setCart(customer.getCart());
            newItem.setQuantity(quantity);
            savedItem = cartRepo.save(newItem);
        }

        try {
            String productName = product.getName() != null ? product.getName() : "sản phẩm";
            String variantName = finalVariant != null ? " (" + finalVariant.getName() + ")" : "";
            String message = String.format("Bạn đã thêm %d x \"%s%s\" vào giỏ hàng", quantity, productName, variantName);
            notifyService.createNotification(customer.getId(), message, "CART_ADD", product.getId());
        } catch (Exception e) {
            System.err.println("❌ Failed to send cart notification: " + e.getMessage());
        }

        return savedItem;
    }


    // Tăng số lượng (user)
    public CartItem increaseQuantity(Long userId, long itemId) {
        CartItem item = cartRepo.findById(itemId)
                .orElseThrow(() -> new RuntimeException("Cart item not found with id=" + itemId));

        Customer customer = getCustomerByUserIdOrThrow(userId);

        if (item.getCart() == null || customer.getCart() == null ||
                !Objects.equals(item.getCart().getId(), customer.getCart().getId())) {
            throw new RuntimeException("Unauthorized: cart item does not belong to this user");
        }

        Product product = item.getProduct();
        if (product == null) {
            throw new RuntimeException("Sản phẩm không tồn tại");
        }

        validateProductAvailability(product);
        int newQuantity = ensureQuantityWithinStock(item.getQuantity() + 1, product);
        item.setQuantity(newQuantity);
        return cartRepo.save(item);
    }

    // Giảm số lượng (user)
    public CartItem decreaseQuantity(Long userId, long itemId) {
        CartItem item = cartRepo.findById(itemId)
                .orElseThrow(() -> new RuntimeException("Cart item not found with id=" + itemId));

        Customer customer = getCustomerByUserIdOrThrow(userId);

        if (item.getCart() == null || customer.getCart() == null ||
                !Objects.equals(item.getCart().getId(), customer.getCart().getId())) {
            throw new RuntimeException("Unauthorized: cart item does not belong to this user");
        }

        Product product = item.getProduct();
        if (product == null || product.isHidden() || product.getStock() <= 0) {
            cartRepo.delete(item);
            throw new RuntimeException("Sản phẩm không còn khả dụng");
        }

        if (item.getQuantity() > 1) {
            item.setQuantity(item.getQuantity() - 1);
            return cartRepo.save(item);
        } else {
            cartRepo.deleteById(itemId);
            return null;
        }
    }

    // Remove item (user)
    public void removeItem(Long userId, long itemId) {
        CartItem item = cartRepo.findById(itemId)
                .orElseThrow(() -> new RuntimeException("Cart item not found with id=" + itemId));

        Customer customer = customerRepo.findById(userId)
                .orElseThrow(() -> new RuntimeException("Customer not found for userId=" + userId));

        if (item.getCart() == null || customer.getCart() == null ||
                !Objects.equals(item.getCart().getId(), customer.getCart().getId())) {
            throw new RuntimeException("Unauthorized: cart item does not belong to this user");
        }

        cartRepo.deleteById(itemId);
    }


}
