package com.hometech.hometech.service;

import com.hometech.hometech.Repository.CustomerRepository;
import com.hometech.hometech.Repository.FavoriteRepository;
import com.hometech.hometech.Repository.ProductRepository;
import com.hometech.hometech.model.Customer;
import com.hometech.hometech.model.Favorite;
import com.hometech.hometech.model.Product;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@Transactional
public class FavoriteService {

    private final FavoriteRepository favoriteRepository;
    private final CustomerRepository customerRepository;
    private final ProductRepository productRepository;

    public FavoriteService(FavoriteRepository favoriteRepository,
                           CustomerRepository customerRepository,
                           ProductRepository productRepository) {
        this.favoriteRepository = favoriteRepository;
        this.customerRepository = customerRepository;
        this.productRepository = productRepository;
    }

    private Customer getCustomer(Long userId) {
        return customerRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Customer not found for userId=" + userId));
    }

    private Product getProduct(Long productId) {
        return productRepository.findById(productId)
                .orElseThrow(() -> new RuntimeException("Product not found with id=" + productId));
    }

    public List<Product> getFavorites(Long userId) {
        getCustomer(userId); // đảm bảo tồn tại
        List<Favorite> favorites = favoriteRepository.findByCustomerId(userId);
        return favorites.stream()
                .map(Favorite::getProduct)
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
    }

    public Favorite addFavorite(Long userId, Long productId) {
        Customer customer = getCustomer(userId);
        Product product = getProduct(productId);

        return favoriteRepository.findByCustomerIdAndProductId(userId, productId)
                .orElseGet(() -> {
                    Favorite favorite = new Favorite();
                    favorite.setCustomer(customer);
                    favorite.setProduct(product);
                    return favoriteRepository.save(favorite);
                });
    }

    public boolean removeFavorite(Long userId, Long productId) {
        if (!favoriteRepository.existsByCustomerIdAndProductId(userId, productId)) {
            return false;
        }
        favoriteRepository.deleteByCustomerIdAndProductId(userId, productId);
        return true;
    }

    public boolean isFavorite(Long userId, Long productId) {
        return favoriteRepository.existsByCustomerIdAndProductId(userId, productId);
    }
}

