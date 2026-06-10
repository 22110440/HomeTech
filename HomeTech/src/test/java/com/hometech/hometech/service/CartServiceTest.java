package com.hometech.hometech.service;

import com.hometech.hometech.Repository.CartItemRepository;
import com.hometech.hometech.Repository.CartRepository;
import com.hometech.hometech.Repository.CustomerRepository;
import com.hometech.hometech.Repository.ProductRepository;
import com.hometech.hometech.Repository.ProductVariantRepository;
import com.hometech.hometech.model.Cart;
import com.hometech.hometech.model.CartItem;
import com.hometech.hometech.model.Customer;
import com.hometech.hometech.model.Product;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CartServiceTest {

    @Mock
    private CartItemRepository cartItemRepository;

    @Mock
    private CartRepository cartRepository;

    @Mock
    private ProductRepository productRepository;

    @Mock
    private CustomerRepository customerRepository;

    @Mock
    private NotifyService notifyService;

    @Mock
    private ProductVariantRepository productVariantRepository;

    private CartService service;

    @BeforeEach
    void setUp() {
        service = new CartService(
                cartItemRepository,
                cartRepository,
                productRepository,
                customerRepository,
                notifyService,
                productVariantRepository
        );
    }

    @Test
    void addProductCreatesPersistedCartBeforeSavingFirstCartItem() {
        Customer customer = new Customer();
        customer.setId(2L);

        Product product = new Product();
        product.setId(99L);
        product.setName("iPhone 15 128GB");
        product.setStock(5);
        product.setHidden(false);

        when(customerRepository.findById(2L)).thenReturn(Optional.of(customer));
        when(productRepository.findById(99L)).thenReturn(Optional.of(product));
        when(cartRepository.findByCustomerId(2L)).thenReturn(Optional.empty());
        when(cartRepository.saveAndFlush(any(Cart.class))).thenAnswer(invocation -> {
            Cart cart = invocation.getArgument(0);
            cart.setId(10L);
            return cart;
        });
        when(cartItemRepository.findByCart(any(Cart.class))).thenReturn(List.of());
        when(cartItemRepository.save(any(CartItem.class))).thenAnswer(invocation -> {
            CartItem item = invocation.getArgument(0);
            item.setId(100L);
            return item;
        });

        CartItem result = service.addProduct(2L, 99L, 2, null);

        assertThat(result.getCart()).isNotNull();
        assertThat(result.getCart().getId()).isEqualTo(10L);
        assertThat(result.getCart().getCustomer()).isSameAs(customer);
        assertThat(customer.getCart()).isSameAs(result.getCart());
        assertThat(result.getProduct()).isSameAs(product);
        assertThat(result.getQuantity()).isEqualTo(2);

        InOrder saveOrder = inOrder(cartRepository, cartItemRepository);
        saveOrder.verify(cartRepository).saveAndFlush(any(Cart.class));
        saveOrder.verify(cartItemRepository).save(any(CartItem.class));
        verify(notifyService).createNotification(eq(2L), contains("iPhone 15 128GB"), eq("CART_ADD"), eq(99L));
    }
}
