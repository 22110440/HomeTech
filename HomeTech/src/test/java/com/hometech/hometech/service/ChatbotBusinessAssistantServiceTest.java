package com.hometech.hometech.service;

import com.hometech.hometech.Repository.ConversationRepository;
import com.hometech.hometech.Repository.OrderRepository;
import com.hometech.hometech.Repository.ProductRepository;
import com.hometech.hometech.Repository.RepairBookingRepository;
import com.hometech.hometech.Repository.RepairServicePackageRepository;
import com.hometech.hometech.model.Category;
import com.hometech.hometech.model.Conversation;
import com.hometech.hometech.model.Customer;
import com.hometech.hometech.model.Product;
import com.hometech.hometech.model.ProductVariant;
import com.hometech.hometech.model.RepairServicePackage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.lang.reflect.InvocationHandler;
import java.lang.reflect.Method;
import java.lang.reflect.Proxy;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

class ChatbotBusinessAssistantServiceTest {

    private ChatbotBusinessAssistantService service;
    private List<Product> productCandidates;
    private List<RepairServicePackage> repairCandidates;
    private int productSearchCalls;

    @BeforeEach
    void setUp() {
        Customer customer = new Customer();
        customer.setId(7L);
        Conversation conversation = new Conversation();
        conversation.setId(1L);
        conversation.setCustomer(customer);

        productCandidates = List.of();
        repairCandidates = List.of();
        productSearchCalls = 0;

        ConversationRepository conversationRepository = repositoryProxy(
                ConversationRepository.class,
                (method, args) -> "findById".equals(method.getName()) ? Optional.of(conversation) : Unhandled.VALUE
        );
        ProductRepository productRepository = repositoryProxy(
                ProductRepository.class,
                (method, args) -> {
                    if ("searchActiveForChatbot".equals(method.getName())) {
                        productSearchCalls++;
                        return productCandidates;
                    }
                    return Unhandled.VALUE;
                }
        );
        RepairServicePackageRepository repairServicePackageRepository = repositoryProxy(
                RepairServicePackageRepository.class,
                (method, args) -> {
                    if ("searchActiveForChatbot".equals(method.getName())) {
                        return repairCandidates;
                    }
                    return Unhandled.VALUE;
                }
        );

        service = new ChatbotBusinessAssistantService(
                conversationRepository,
                productRepository,
                repositoryProxy(OrderRepository.class, (method, args) -> Unhandled.VALUE),
                repositoryProxy(RepairBookingRepository.class, (method, args) -> Unhandled.VALUE),
                repairServicePackageRepository
        );
    }

    @Test
    void phoneAdviceDoesNotReturnAccessoriesThatOnlyMatchBudget() {
        Product airPods = product(10L, "AirPods Pro 2", 5_990_000D, "Phụ kiện");
        Product sonyHeadphones = product(11L, "Sony WH-1000XM5", 7_990_000D, "Tai nghe");
        Product iphone = product(12L, "iPhone 13 128GB", 10_990_000D, "Điện thoại");

        productCandidates = List.of(airPods, sonyHeadphones, iphone);

        ChatbotBusinessAssistantService.AssistantReply reply = service
                .resolveReply(1L, "điện thoại tầm giá 10 triệu")
                .orElseThrow();

        assertThat(reply.isHandoffRequested()).isFalse();
        assertThat(reply.getContent())
                .contains("iPhone 13 128GB")
                .doesNotContain("AirPods Pro 2")
                .doesNotContain("Sony WH-1000XM5");
    }

    @Test
    void explicitPhoneAdviceDoesNotFallbackToAllProductsWhenNoPhonesMatch() {
        Product airPods = product(10L, "AirPods Pro 2", 5_990_000D, "Phụ kiện");
        Product sonyHeadphones = product(11L, "Sony WH-1000XM5", 7_990_000D, "Tai nghe");

        productCandidates = List.of(airPods, sonyHeadphones);

        ChatbotBusinessAssistantService.AssistantReply reply = service
                .resolveReply(1L, "điện thoại tầm giá 10 triệu")
                .orElseThrow();

        assertThat(reply.isHandoffRequested()).isTrue();
        assertThat(reply.getContent())
                .contains("điện thoại")
                .doesNotContain("AirPods Pro 2")
                .doesNotContain("Sony WH-1000XM5");
        assertThat(productSearchCalls).isEqualTo(1);
    }

    @Test
    void headphoneAdviceCanStillReturnHeadphonesUnderBudget() {
        Product airPods = product(10L, "AirPods Pro 2", 5_990_000D, "Phụ kiện tai nghe");
        Product sonyHeadphones = product(11L, "Sony WH-1000XM5", 7_990_000D, "Tai nghe");
        Product iphone = product(12L, "iPhone 13 128GB", 10_990_000D, "Điện thoại");

        productCandidates = List.of(airPods, sonyHeadphones, iphone);

        ChatbotBusinessAssistantService.AssistantReply reply = service
                .resolveReply(1L, "tai nghe dưới 10 triệu")
                .orElseThrow();

        assertThat(reply.isHandoffRequested()).isFalse();
        assertThat(reply.getContent())
                .contains("AirPods Pro 2")
                .contains("Sony WH-1000XM5")
                .doesNotContain("iPhone 13 128GB");
    }

    @Test
    void storageAdviceOnlyReturnsProductsWithRequestedStorage() {
        Product realme64 = product(557L, "Realme C85 (4G) 3GB/64GB Vàng - Mới 100%", 4_730_000D, "Điện thoại");
        Product vivo256 = product(873L, "Vivo X200 (5G) 8GB/256GB Đen - 1 đổi 1 12 tháng", 15_340_000D, "Điện thoại");
        Product iphone512 = product(14L, "iPhone 15 Pro Max", 27_990_000D, "Điện thoại");
        iphone512.setVariants(List.of(variant("512GB Titan tự nhiên")));

        productCandidates = List.of(realme64, vivo256, iphone512);

        ChatbotBusinessAssistantService.AssistantReply reply = service
                .resolveReply(1L, "tôi muốn tìm điện thoại 512 GB")
                .orElseThrow();

        assertThat(reply.isHandoffRequested()).isFalse();
        assertThat(reply.getContent())
                .contains("iPhone 15 Pro Max")
                .doesNotContain("Realme C85")
                .doesNotContain("Vivo X200");
    }

    @Test
    void repairBatteryAdviceWithIphoneOnlyReturnsIphonePackages() {
        RepairServicePackage iphoneBattery = repairPackage(2L, "iPhone", "Thay pin", "Thay pin iPhone", 660_000);
        RepairServicePackage samsungBattery = repairPackage(10L, "Samsung", "Thay pin", "Thay pin Samsung", 590_000);
        RepairServicePackage xiaomiBattery = repairPackage(18L, "Xiaomi", "Thay pin", "Thay pin Xiaomi", 490_000);
        RepairServicePackage oppoBattery = repairPackage(34L, "Oppo", "Thay pin", "Thay pin Oppo", 590_000);

        repairCandidates = List.of(iphoneBattery, samsungBattery, xiaomiBattery, oppoBattery);

        ChatbotBusinessAssistantService.AssistantReply reply = service
                .resolveReply(1L, "Báo giá thay pin iPhone")
                .orElseThrow();

        assertThat(reply.isHandoffRequested()).isFalse();
        assertThat(reply.getContent())
                .contains("Thay pin iPhone")
                .doesNotContain("Thay pin Samsung")
                .doesNotContain("Thay pin Xiaomi")
                .doesNotContain("Thay pin Oppo");
    }

    @Test
    void colorAdviceOnlyReturnsProductsWithRequestedColorWhenColorIsExplicit() {
        Product realmeYellow = product(557L, "Realme C85 3GB/64GB Vàng", 4_730_000D, "Điện thoại");
        Product vivoBlack = product(873L, "Vivo X200 8GB/256GB Đen", 15_340_000D, "Điện thoại");

        productCandidates = List.of(realmeYellow, vivoBlack);

        ChatbotBusinessAssistantService.AssistantReply reply = service
                .resolveReply(1L, "tìm điện thoại màu đen")
                .orElseThrow();

        assertThat(reply.isHandoffRequested()).isFalse();
        assertThat(reply.getContent())
                .contains("Vivo X200")
                .doesNotContain("Realme C85");
    }

    private Product product(Long id, String name, double price, String categoryName) {
        Category category = new Category();
        category.setName(categoryName);

        Product product = new Product();
        product.setId(id);
        product.setName(name);
        product.setPrice(price);
        product.setStock(10);
        product.setSoldCount(20);
        product.setHidden(false);
        product.setCategory(category);
        return product;
    }

    private ProductVariant variant(String name) {
        ProductVariant variant = new ProductVariant();
        variant.setName(name);
        variant.setStock(10);
        return variant;
    }

    private RepairServicePackage repairPackage(Long id, String phoneType, String category, String name, int price) {
        RepairServicePackage repairPackage = new RepairServicePackage();
        repairPackage.setId(id);
        repairPackage.setPhoneType(phoneType);
        repairPackage.setServiceCategory(category);
        repairPackage.setServiceName(name);
        repairPackage.setDescription(name);
        repairPackage.setPrice(BigDecimal.valueOf(price));
        repairPackage.setEstimatedDurationMinutes(75);
        repairPackage.setActive(true);
        return repairPackage;
    }

    @SuppressWarnings("unchecked")
    private <T> T repositoryProxy(Class<T> type, MethodRouter router) {
        InvocationHandler handler = (proxy, method, args) -> {
            if (method.getDeclaringClass().equals(Object.class)) {
                return handleObjectMethod(proxy, method, args);
            }
            Object result = router.invoke(method, args == null ? new Object[0] : args);
            return result == Unhandled.VALUE ? defaultValue(method.getReturnType()) : result;
        };
        return (T) Proxy.newProxyInstance(type.getClassLoader(), new Class<?>[]{type}, handler);
    }

    private Object handleObjectMethod(Object proxy, Method method, Object[] args) {
        return switch (method.getName()) {
            case "toString" -> proxy.getClass().getInterfaces()[0].getSimpleName() + "Proxy";
            case "hashCode" -> System.identityHashCode(proxy);
            case "equals" -> proxy == args[0];
            default -> null;
        };
    }

    private Object defaultValue(Class<?> returnType) {
        if (returnType.equals(Void.TYPE)) {
            return null;
        }
        if (returnType.equals(Boolean.TYPE)) {
            return false;
        }
        if (returnType.equals(Byte.TYPE)) {
            return (byte) 0;
        }
        if (returnType.equals(Short.TYPE)) {
            return (short) 0;
        }
        if (returnType.equals(Integer.TYPE)) {
            return 0;
        }
        if (returnType.equals(Long.TYPE)) {
            return 0L;
        }
        if (returnType.equals(Float.TYPE)) {
            return 0F;
        }
        if (returnType.equals(Double.TYPE)) {
            return 0D;
        }
        if (Optional.class.isAssignableFrom(returnType)) {
            return Optional.empty();
        }
        if (List.class.isAssignableFrom(returnType)) {
            return List.of();
        }
        return null;
    }

    private interface MethodRouter {
        Object invoke(Method method, Object[] args) throws Throwable;
    }

    private enum Unhandled {
        VALUE
    }
}
