package com.hometech.hometech.service;

import com.hometech.hometech.Repository.ConversationRepository;
import com.hometech.hometech.Repository.OrderRepository;
import com.hometech.hometech.Repository.ProductRepository;
import com.hometech.hometech.Repository.RepairBookingRepository;
import com.hometech.hometech.Repository.RepairServicePackageRepository;
import com.hometech.hometech.enums.OrderStatus;
import com.hometech.hometech.enums.RepairBookingStatus;
import com.hometech.hometech.model.Conversation;
import com.hometech.hometech.model.Customer;
import com.hometech.hometech.model.Order;
import com.hometech.hometech.model.OrderItem;
import com.hometech.hometech.model.Product;
import com.hometech.hometech.model.ProductAttributeValue;
import com.hometech.hometech.model.ProductVariant;
import com.hometech.hometech.model.RepairBooking;
import com.hometech.hometech.model.RepairServicePackage;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.text.NumberFormat;
import java.text.Normalizer;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class ChatbotBusinessAssistantService {

    private static final Locale VI_LOCALE = Locale.forLanguageTag("vi-VN");
    private static final NumberFormat VND_FORMAT = NumberFormat.getCurrencyInstance(VI_LOCALE);
    private static final DateTimeFormatter DATE_TIME_FORMAT = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter TIME_FORMAT = DateTimeFormatter.ofPattern("HH:mm");
    private static final int PRODUCT_CANDIDATE_LIMIT = 80;
    private static final int PRODUCT_CONSTRAINED_CANDIDATE_LIMIT = 500;
    private static final int PRODUCT_REPLY_LIMIT = 5;
    private static final int REPAIR_CANDIDATE_LIMIT = 80;
    private static final int REPAIR_REPLY_LIMIT = 5;
    private static final double APPROXIMATE_BUDGET_RATE = 0.2D;

    private static final Pattern RANGE_MILLION_BUDGET_PATTERN = Pattern.compile("(?:tu\\s*)?(\\d+[\\d.,]*)\\s*(?:den|toi|-)\\s*(\\d+[\\d.,]*)\\s*(?:trieu|tr|m)\\b");
    private static final Pattern MILLION_BUDGET_PATTERN = Pattern.compile("(\\d+[\\d.,]*)\\s*(trieu|tr|m)\\b");
    private static final Pattern THOUSAND_BUDGET_PATTERN = Pattern.compile("(\\d+[\\d.,]*)\\s*(nghin|ngan|k)\\b");
    private static final Pattern LARGE_NUMBER_PATTERN = Pattern.compile("\\b(\\d[\\d.,]{4,})\\b");
    private static final Pattern HASH_ID_PATTERN = Pattern.compile("#\\s*(\\d{1,9})");
    private static final Pattern ORDER_ID_PATTERN = Pattern.compile("(?:ma\\s*)?(?:don\\s*hang|don|order)\\s*(?:so|ma)?\\s*(\\d{1,9})");
    private static final Pattern BOOKING_ID_PATTERN = Pattern.compile("(?:ma\\s*)?(?:lich\\s*hen|lich|booking)\\s*(?:so|ma)?\\s*(\\d{1,9})");
    private static final Pattern SAMSUNG_PHONE_MODEL_PATTERN = Pattern.compile("\\b(?:samsung\\s+)?galaxy\\s+(?:s|a|z|m|note)\\s?\\d{1,3}\\b|\\bsamsung\\s+(?:s|a|z|m|note)\\s?\\d{1,3}\\b");
    private static final Pattern MEMORY_TERM_PATTERN = Pattern.compile("\\b(\\d{1,4})\\s*(tb|gb|g)\\b");

    private final ConversationRepository conversationRepository;
    private final ProductRepository productRepository;
    private final OrderRepository orderRepository;
    private final RepairBookingRepository repairBookingRepository;
    private final RepairServicePackageRepository repairServicePackageRepository;

    public ChatbotBusinessAssistantService(ConversationRepository conversationRepository,
                                           ProductRepository productRepository,
                                           OrderRepository orderRepository,
                                           RepairBookingRepository repairBookingRepository,
                                           RepairServicePackageRepository repairServicePackageRepository) {
        this.conversationRepository = conversationRepository;
        this.productRepository = productRepository;
        this.orderRepository = orderRepository;
        this.repairBookingRepository = repairBookingRepository;
        this.repairServicePackageRepository = repairServicePackageRepository;
    }

    @Transactional(readOnly = true)
    public Optional<AssistantReply> resolveReply(Long conversationId, String message) {
        if (conversationId == null || message == null || message.trim().isEmpty()) {
            return Optional.empty();
        }

        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy cuộc trò chuyện"));
        Customer customer = conversation.getCustomer();
        if (customer == null) {
            return Optional.empty();
        }

        String normalized = normalize(message);
        if (isHumanHandoffIntent(normalized)) {
            return Optional.of(AssistantReply.handoff(
                    "HANDOFF_REQUEST",
                    "Mình đã chuyển yêu cầu của bạn cho nhân viên HomeTech. Trong lúc chờ phản hồi, bạn có thể gửi thêm mã đơn, dòng máy hoặc hình ảnh lỗi để nhân viên xử lý nhanh hơn.",
                    compact(message)
            ));
        }

        if (isOrderStatusIntent(normalized)) {
            return Optional.of(resolveOrderStatus(customer, normalized));
        }

        if (isRepairStatusIntent(normalized)) {
            return Optional.of(resolveRepairBookingStatus(customer, normalized));
        }

        if (isRepairCreateIntent(normalized)) {
            return Optional.of(resolvePreliminaryRepairRequest(message, normalized));
        }

        if (isRepairPackageIntent(normalized)) {
            return Optional.of(resolveRepairPackageAdvice(message, normalized));
        }

        if (isProductAdviceIntent(normalized)) {
            return Optional.of(resolveProductAdvice(normalized));
        }

        return Optional.empty();
    }

    private AssistantReply resolveProductAdvice(String normalized) {
        BudgetFilter budget = extractBudgetFilter(normalized);
        ProductIntent intent = extractProductIntent(normalized);
        int candidateLimit = intent.hasStrictFilters() ? PRODUCT_CONSTRAINED_CANDIDATE_LIMIT : PRODUCT_CANDIDATE_LIMIT;
        List<Product> products = productRepository.searchActiveForChatbot(
                intent.queryKeyword(),
                budget.minPrice(),
                budget.maxPrice(),
                true,
                PageRequest.of(0, candidateLimit)
        ).stream()
                .filter(intent::matches)
                .sorted(productComparator(budget))
                .limit(PRODUCT_REPLY_LIMIT)
                .toList();

        if (products.isEmpty()) {
            return AssistantReply.handoff(
                    "PRODUCT_ADVICE",
                    "Mình chưa tìm thấy " + intent.label() + " phù hợp" + budget.describeForNotFound()
                            + ". Bạn cho mình thêm hãng/dòng máy, nhu cầu sử dụng hoặc nới ngân sách để nhân viên HomeTech tư vấn chính xác hơn nhé.",
                    "Không tìm thấy " + intent.label() + " phù hợp"
            );
        }

        StringBuilder reply = new StringBuilder("Mình tìm được một số ")
                .append(intent.label())
                .append(" phù hợp")
                .append(budget.describeForReply());
        reply.append(":\n");

        for (Product product : products) {
            reply.append("\n- ")
                    .append(safe(product.getName()))
                    .append(" - ")
                    .append(formatMoney(product.getPrice()))
                    .append(" | tồn kho: ")
                    .append(product.getStock())
                    .append(" | đã bán: ")
                    .append(product.getSoldCount())
                    .append("\n  Xem chi tiết: /product/")
                    .append(product.getId());
        }

        reply.append("\n\nNếu bạn cho biết nhu cầu cụ thể như học tập, gaming, văn phòng, chụp ảnh hoặc thương hiệu yêu thích, mình sẽ lọc sát hơn.");
        return AssistantReply.business("PRODUCT_ADVICE", reply.toString());
    }

    private AssistantReply resolveOrderStatus(Customer customer, String normalized) {
        Optional<Long> orderId = extractOrderId(normalized);
        if (orderId.isPresent()) {
            Optional<Order> order = orderRepository.findByIdWithRelations(orderId.get())
                    .filter(o -> o.getCustomer() != null && customer.getId().equals(o.getCustomer().getId()));
            if (order.isEmpty()) {
                return AssistantReply.business("ORDER_STATUS", "Mình không tìm thấy đơn hàng #" + orderId.get() + " trong tài khoản của bạn.");
            }
            return AssistantReply.business("ORDER_STATUS", formatOrderDetail(order.get()));
        }

        List<Order> orders = orderRepository.findTop5ByCustomerOrderByCreatedAtDesc(customer);
        if (orders.isEmpty()) {
            return AssistantReply.business("ORDER_STATUS", "Tài khoản của bạn chưa có đơn hàng nào. Bạn có thể cho mình biết sản phẩm đang quan tâm để mình hỗ trợ chọn mua.");
        }

        StringBuilder reply = new StringBuilder("Các đơn hàng gần đây của bạn:");
        for (Order order : orders) {
            reply.append("\n\n")
                    .append(formatOrderSummary(order));
        }
        reply.append("\n\nBạn gửi mã đơn dạng #123 nếu muốn xem chi tiết một đơn cụ thể.");
        return AssistantReply.business("ORDER_STATUS", reply.toString());
    }

    private AssistantReply resolveRepairBookingStatus(Customer customer, String normalized) {
        Optional<Long> bookingId = extractBookingId(normalized);
        if (bookingId.isPresent()) {
            Optional<RepairBooking> booking = repairBookingRepository.findById(bookingId.get())
                    .filter(b -> b.getCustomer() != null && customer.getId().equals(b.getCustomer().getId()));
            if (booking.isEmpty()) {
                return AssistantReply.business("REPAIR_STATUS", "Mình không tìm thấy lịch sửa chữa #" + bookingId.get() + " trong tài khoản của bạn.");
            }
            return AssistantReply.business("REPAIR_STATUS", formatRepairBookingDetail(booking.get()));
        }

        List<RepairBooking> bookings = repairBookingRepository.findTop5ByCustomerIdOrderByCreatedAtDesc(customer.getId());
        if (bookings.isEmpty()) {
            return AssistantReply.business("REPAIR_STATUS", "Bạn chưa có lịch sửa chữa nào. Nếu muốn đặt lịch, hãy gửi dòng máy và lỗi gặp phải, ví dụ: \"iPhone 12 vỡ màn hình\".");
        }

        StringBuilder reply = new StringBuilder("Các lịch sửa chữa gần đây của bạn:");
        for (RepairBooking booking : bookings) {
            reply.append("\n\n")
                    .append(formatRepairBookingSummary(booking));
        }
        reply.append("\n\nBạn gửi mã lịch dạng #123 nếu muốn xem chi tiết một lịch cụ thể.");
        return AssistantReply.business("REPAIR_STATUS", reply.toString());
    }

    private AssistantReply resolveRepairPackageAdvice(String message, String normalized) {
        Double maxPriceValue = extractBudget(normalized);
        BigDecimal maxPrice = maxPriceValue == null ? null : BigDecimal.valueOf(maxPriceValue);
        RepairIntent intent = extractRepairIntent(normalized);
        List<RepairServicePackage> packages = repairServicePackageRepository.searchActiveForChatbot(
                null,
                maxPrice,
                PageRequest.of(0, REPAIR_CANDIDATE_LIMIT)
        ).stream()
                .filter(intent::matches)
                .limit(REPAIR_REPLY_LIMIT)
                .toList();

        if (packages.isEmpty()) {
            return AssistantReply.handoff(
                    "REPAIR_ADVICE",
                    "Mình chưa tìm thấy gói sửa chữa" + intent.labelForSentence() + " khớp với mô tả này. Mình đã chuyển yêu cầu cho nhân viên, bạn gửi thêm dòng máy, lỗi cụ thể và ảnh nếu có nhé.",
                    "Không tìm thấy gói sửa chữa" + intent.labelForSentence()
            );
        }

        StringBuilder reply = new StringBuilder("Một số gói sửa chữa")
                .append(intent.labelForSentence())
                .append(" phù hợp:");
        for (RepairServicePackage item : packages) {
            reply.append("\n\n- ")
                    .append(safe(item.getServiceName()))
                    .append(" | ")
                    .append(safe(item.getPhoneType()))
                    .append(" / ")
                    .append(safe(item.getServiceCategory()))
                    .append("\n  Giá: ")
                    .append(formatMoney(item.getPrice()))
                    .append(" | thời gian dự kiến: ")
                    .append(item.getEstimatedDurationMinutes())
                    .append(" phút")
                    .append("\n  Xem chi tiết: /repair-packages/")
                    .append(item.getId());
        }
        reply.append("\n\nNếu muốn đặt lịch, bạn gửi: dòng máy, lỗi cần sửa, ngày giờ mong muốn và số điện thoại liên hệ.");
        return AssistantReply.business("REPAIR_ADVICE", reply.toString());
    }

    private AssistantReply resolvePreliminaryRepairRequest(String message, String normalized) {
        RepairIntent intent = extractRepairIntent(normalized);
        StringBuilder reply = new StringBuilder("Mình đã ghi nhận yêu cầu sửa chữa sơ bộ và chuyển cho nhân viên HomeTech.");
        if (intent.hasCriteria()) {
            reply.append("\nVấn đề dự kiến: ").append(intent.label());
        }
        reply.append("\n\nĐể tạo lịch chính thức, bạn vui lòng gửi thêm:");
        reply.append("\n- Dòng máy");
        reply.append("\n- Lỗi cần sửa");
        reply.append("\n- Ngày giờ mong muốn");
        reply.append("\n- Số điện thoại liên hệ");
        reply.append("\n\nBạn cũng có thể mở trang đặt lịch: /repair-booking");
        return AssistantReply.handoff("REPAIR_PREBOOKING", reply.toString(), compact(message));
    }

    private boolean isHumanHandoffIntent(String normalized) {
        return containsAny(normalized,
                "gap nhan vien", "nhan vien tu van", "tu van vien", "admin", "nguoi that",
                "goi lai", "lien he lai", "chuyen nhan vien", "can ho tro truc tiep");
    }

    private boolean isOrderStatusIntent(String normalized) {
        return containsAny(normalized, "don hang", "ma don", "trang thai don", "kiem tra don", "order");
    }

    private boolean isRepairStatusIntent(String normalized) {
        return containsAny(normalized, "lich sua", "lich hen", "tien do sua", "trang thai sua", "ma lich", "booking");
    }

    private boolean isRepairCreateIntent(String normalized) {
        return containsAny(normalized, "dat lich sua", "tao yeu cau sua", "hen sua", "dat hen sua", "tao lich sua");
    }

    private boolean isRepairPackageIntent(String normalized) {
        return containsAny(normalized,
                "sua", "thay pin", "thay man", "man hinh", "camera", "loa", "mic", "sac",
                "bao gia sua", "gia sua", "bao hanh", "roi vo", "vo man", "loi nguon");
    }

    private boolean isProductAdviceIntent(String normalized) {
        return containsAny(normalized,
                "tu van", "goi y", "nen mua", "mua gi", "san pham", "dien thoai", "laptop",
                "may tinh", "iphone", "samsung", "xiaomi", "oppo", "macbook", "ipad", "tai nghe",
                "ngan sach", "tam gia", "duoi", "khoang gia");
    }

    private Optional<Long> extractOrderId(String normalized) {
        return extractId(ORDER_ID_PATTERN, normalized).or(() -> extractId(HASH_ID_PATTERN, normalized));
    }

    private Optional<Long> extractBookingId(String normalized) {
        return extractId(BOOKING_ID_PATTERN, normalized).or(() -> extractId(HASH_ID_PATTERN, normalized));
    }

    private Optional<Long> extractId(Pattern pattern, String text) {
        Matcher matcher = pattern.matcher(text);
        if (!matcher.find()) {
            return Optional.empty();
        }
        try {
            return Optional.of(Long.parseLong(matcher.group(1)));
        } catch (NumberFormatException ex) {
            return Optional.empty();
        }
    }

    private Double extractBudget(String normalized) {
        try {
            Matcher millionMatcher = MILLION_BUDGET_PATTERN.matcher(normalized);
            if (millionMatcher.find()) {
                return parseLocalizedNumber(millionMatcher.group(1)) * 1_000_000D;
            }

            Matcher thousandMatcher = THOUSAND_BUDGET_PATTERN.matcher(normalized);
            if (thousandMatcher.find()) {
                return parseLocalizedNumber(thousandMatcher.group(1)) * 1_000D;
            }

            Matcher largeNumberMatcher = LARGE_NUMBER_PATTERN.matcher(normalized);
            if (largeNumberMatcher.find()) {
                return parseLocalizedNumber(largeNumberMatcher.group(1));
            }
        } catch (NumberFormatException ignored) {
            return null;
        }

        return null;
    }

    private BudgetFilter extractBudgetFilter(String normalized) {
        Double rangeMin = null;
        Double rangeMax = null;

        try {
            Matcher rangeMatcher = RANGE_MILLION_BUDGET_PATTERN.matcher(normalized);
            if (rangeMatcher.find()) {
                double first = parseLocalizedNumber(rangeMatcher.group(1)) * 1_000_000D;
                double second = parseLocalizedNumber(rangeMatcher.group(2)) * 1_000_000D;
                rangeMin = Math.min(first, second);
                rangeMax = Math.max(first, second);
            }
        } catch (NumberFormatException ignored) {
            rangeMin = null;
            rangeMax = null;
        }

        if (rangeMin != null && rangeMax != null) {
            return new BudgetFilter(rangeMin, rangeMax, (rangeMin + rangeMax) / 2D, true);
        }

        Double amount = extractBudget(normalized);
        if (amount == null) {
            return new BudgetFilter(null, null, null, false);
        }

        if (isApproximateBudget(normalized)) {
            double minPrice = Math.max(0D, amount * (1D - APPROXIMATE_BUDGET_RATE));
            double maxPrice = amount * (1D + APPROXIMATE_BUDGET_RATE);
            return new BudgetFilter(minPrice, maxPrice, amount, true);
        }

        return new BudgetFilter(null, amount, null, false);
    }

    private boolean isApproximateBudget(String normalized) {
        if (containsAny(normalized, "duoi", "toi da", "khong qua", "nho hon", "re hon", "ngan sach")) {
            return false;
        }
        return containsAny(normalized, "tam gia", "khoang", "gan", "quanh", "co tam")
                || Pattern.compile("\\btam\\b").matcher(normalized).find();
    }

    private double parseLocalizedNumber(String raw) {
        String value = raw.trim();
        if (value.contains(".") && value.contains(",")) {
            value = value.replace(".", "").replace(",", ".");
        } else if (value.contains(",")) {
            value = value.replace(",", ".");
        } else if (value.contains(".")) {
            int lastDot = value.lastIndexOf('.');
            int digitsAfter = value.length() - lastDot - 1;
            if (digitsAfter == 3 && value.length() > 4) {
                value = value.replace(".", "");
            }
        }
        return Double.parseDouble(value);
    }

    private ProductIntent extractProductIntent(String normalized) {
        ProductType type = detectProductType(normalized);
        String keyword = extractProductKeyword(normalized, type);
        List<String> requiredTerms = extractProductRequiredTerms(normalized);
        return new ProductIntent(type, keyword, requiredTerms);
    }

    private ProductType detectProductType(String normalized) {
        if (containsAny(normalized, "tai nghe", "headphone", "earbud", "earphone", "airpods", "wh-1000")) {
            return ProductType.HEADPHONE;
        }
        if (containsAny(normalized, "laptop", "may tinh xach tay", "macbook", "notebook")) {
            return ProductType.LAPTOP;
        }
        if (containsAny(normalized, "ipad", "tablet", "may tinh bang", "galaxy tab")) {
            return ProductType.TABLET;
        }
        if (containsAny(normalized, "dien thoai", "smartphone", "iphone", "xiaomi", "redmi", "poco",
                "oppo", "realme", "vivo", "nokia", "pixel") || SAMSUNG_PHONE_MODEL_PATTERN.matcher(normalized).find()) {
            return ProductType.PHONE;
        }
        if (containsAny(normalized, "tivi", "tv")) {
            return ProductType.TV;
        }
        if (containsAny(normalized, "man hinh", "monitor")) {
            return ProductType.MONITOR;
        }
        if (containsAny(normalized, "chuot", "mouse")) {
            return ProductType.MOUSE;
        }
        if (containsAny(normalized, "ban phim", "keyboard")) {
            return ProductType.KEYBOARD;
        }
        if (containsAny(normalized, "loa", "speaker")) {
            return ProductType.SPEAKER;
        }
        if (containsAny(normalized, "camera", "webcam")) {
            return ProductType.CAMERA;
        }
        return null;
    }

    private String extractProductKeyword(String normalized, ProductType type) {
        List<String> keywords = List.of(
                "iphone", "galaxy s", "galaxy a", "galaxy z", "galaxy m", "galaxy note",
                "redmi", "poco", "xiaomi", "oppo", "realme", "vivo", "nokia", "pixel",
                "macbook", "thinkpad", "vivobook", "ideapad", "pavilion", "inspiron", "rog", "tuf",
                "ipad", "galaxy tab", "airpods", "sony", "wh-1000", "samsung",
                "lg", "dell", "asus", "acer", "lenovo", "hp", "msi"
        );
        String keyword = keywords.stream().filter(normalized::contains).findFirst().orElse(null);
        if (keyword == null || type == null) {
            return keyword;
        }
        if (type.matchesKeyword(keyword)) {
            return keyword;
        }
        return null;
    }

    private List<String> extractProductRequiredTerms(String normalized) {
        Set<String> terms = new LinkedHashSet<>();
        Matcher matcher = MEMORY_TERM_PATTERN.matcher(normalized);
        while (matcher.find()) {
            int amount;
            try {
                amount = Integer.parseInt(matcher.group(1));
            } catch (NumberFormatException ignored) {
                continue;
            }

            String unit = matcher.group(2);
            if ("g".equals(unit) && amount < 16) {
                continue; // Avoid treating 4G/5G network keywords as storage or RAM.
            }

            if ("tb".equals(unit)) {
                terms.add(amount + "tb");
            } else if (amount >= 16 || hasMemoryContext(normalized, matcher.start(), matcher.end())) {
                terms.add(amount + "gb");
            }
        }
        terms.addAll(extractProductColorTerms(normalized));
        return new ArrayList<>(terms);
    }

    private List<String> extractProductColorTerms(String normalized) {
        List<String> colors = List.of(
                "den", "trang", "bac", "vang", "tim", "xanh", "hong", "do", "xam", "nau", "kem", "cam"
        );
        return colors.stream()
                .filter(color -> normalized.contains("mau " + color))
                .toList();
    }

    private boolean hasMemoryContext(String normalized, int start, int end) {
        int from = Math.max(0, start - 24);
        int to = Math.min(normalized.length(), end + 24);
        String context = normalized.substring(from, to);
        return containsAny(context, "ram", "rom", "bo nho", "dung luong", "storage", "gb/", "/gb");
    }

    private Comparator<Product> productComparator(BudgetFilter budget) {
        Comparator<Product> bySalesAndPrice = Comparator.comparingInt(Product::getSoldCount)
                .reversed()
                .thenComparing(Comparator.comparingDouble(Product::getPrice).reversed());
        if (budget.targetPrice() == null) {
            return bySalesAndPrice;
        }
        return Comparator.comparingDouble((Product product) -> Math.abs(product.getPrice() - budget.targetPrice()))
                .thenComparing(bySalesAndPrice);
    }

    private RepairIntent extractRepairIntent(String normalized) {
        String serviceKeyword = extractRepairServiceKeyword(normalized);
        String phoneTypeKeyword = extractRepairPhoneTypeKeyword(normalized);
        return new RepairIntent(serviceKeyword, phoneTypeKeyword);
    }

    private String extractRepairServiceKeyword(String normalized) {
        List<String> keywords = List.of(
                "thay pin", "pin",
                "thay man hinh", "thay man", "vo man hinh", "vo man", "man hinh",
                "camera", "loa", "mic", "micro", "cong sac", "chan sac", "sac",
                "nguon", "main", "mat nguon", "ban phim", "trackpad"
        );
        return keywords.stream().filter(normalized::contains).findFirst().orElse(null);
    }

    private String extractRepairPhoneTypeKeyword(String normalized) {
        if (containsAny(normalized, "iphone", "i phone", "iphne", "apple")) {
            return "iphone";
        }
        if (containsAny(normalized, "samsung", "galaxy")) {
            return "samsung";
        }
        if (containsAny(normalized, "xiaomi", "redmi", "poco")) {
            return "xiaomi";
        }
        if (normalized.contains("realme")) {
            return "realme";
        }
        if (normalized.contains("oppo")) {
            return "oppo";
        }
        if (normalized.contains("vivo")) {
            return "vivo";
        }
        if (normalized.contains("nokia")) {
            return "nokia";
        }
        if (containsAny(normalized, "ipad", "tablet", "may tinh bang")) {
            return "ipad";
        }
        if (containsAny(normalized, "laptop", "macbook", "may tinh xach tay")) {
            return "laptop";
        }
        return null;
    }

    private String formatOrderDetail(Order order) {
        String items = order.getItems() == null || order.getItems().isEmpty()
                ? "Chưa có chi tiết sản phẩm"
                : order.getItems().stream().limit(4).map(this::formatOrderItem).collect(Collectors.joining("\n"));
        return "Thông tin đơn hàng #" + order.getId() + ":\n"
                + "- Trạng thái: " + label(order.getStatus()) + "\n"
                + "- Tổng tiền: " + formatMoney(order.getTotalAmount()) + "\n"
                + "- Ngày tạo: " + (order.getCreatedAt() == null ? "Chưa có" : order.getCreatedAt().format(DATE_TIME_FORMAT)) + "\n"
                + "- Sản phẩm:\n" + items;
    }

    private String formatOrderSummary(Order order) {
        return "#" + order.getId()
                + " | " + label(order.getStatus())
                + " | " + formatMoney(order.getTotalAmount())
                + " | " + (order.getCreatedAt() == null ? "Chưa có ngày" : order.getCreatedAt().format(DATE_TIME_FORMAT));
    }

    private String formatOrderItem(OrderItem item) {
        String productName = item.getProduct() == null ? "Sản phẩm" : safe(item.getProduct().getName());
        String variantName = item.getVariant() == null ? "" : " (" + safe(item.getVariant().getName()) + ")";
        return "  + " + productName + variantName + " x" + item.getQuantity() + " - " + formatMoney(item.getPrice());
    }

    private String formatRepairBookingDetail(RepairBooking booking) {
        return "Thông tin lịch sửa chữa #" + booking.getId() + ":\n"
                + "- Trạng thái: " + label(booking.getStatus()) + "\n"
                + "- Dòng máy: " + safe(booking.getDeviceModel()) + "\n"
                + "- Dịch vụ: " + formatRepairPackageName(booking) + "\n"
                + "- Lịch hẹn: " + booking.getAppointmentDate().format(DATE_FORMAT) + " " + booking.getAppointmentTime().format(TIME_FORMAT) + "\n"
                + "- Chi phí dự kiến: " + formatMoney(booking.getTotalAmount()) + "\n"
                + "- Kỹ thuật viên: " + safeOrDefault(booking.getTechnicianName(), "Chưa phân công") + "\n"
                + "- Ghi chú tiến độ: " + safeOrDefault(booking.getProgressNote(), "Chưa có");
    }

    private String formatRepairBookingSummary(RepairBooking booking) {
        return "#" + booking.getId()
                + " | " + label(booking.getStatus())
                + " | " + safe(booking.getDeviceModel())
                + " | " + booking.getAppointmentDate().format(DATE_FORMAT)
                + " " + booking.getAppointmentTime().format(TIME_FORMAT);
    }

    private String formatRepairPackageName(RepairBooking booking) {
        RepairServicePackage pkg = booking.getRepairServicePackage();
        if (pkg == null) {
            return booking.getBookingType() == null ? "Chưa chọn" : booking.getBookingType().name();
        }
        return safe(pkg.getServiceName()) + " - " + safe(pkg.getPhoneType());
    }

    private String label(OrderStatus status) {
        if (status == null) return "Chưa xác định";
        return switch (status) {
            case WAITING_CONFIRMATION -> "Chờ xác nhận";
            case CONFIRMED -> "Đã xác nhận";
            case SHIPPED -> "Đang giao";
            case COMPLETED -> "Hoàn tất";
            case CANCELLED -> "Đã hủy";
        };
    }

    private String label(RepairBookingStatus status) {
        if (status == null) return "Chưa xác định";
        return switch (status) {
            case PENDING -> "Chờ xác nhận";
            case WAITING_PAYMENT -> "Chờ thanh toán";
            case PAID -> "Đã thanh toán";
            case IN_PROGRESS -> "Đang xử lý";
            case CANCELLED -> "Đã hủy";
            case FAILED -> "Thất bại";
            case COMPLETED -> "Hoàn tất";
        };
    }

    private String formatMoney(Number value) {
        if (value == null) {
            return "Chưa có giá";
        }
        return VND_FORMAT.format(value.doubleValue());
    }

    private String normalize(String input) {
        String decomposed = Normalizer.normalize(input.toLowerCase(VI_LOCALE), Normalizer.Form.NFD);
        return decomposed.replaceAll("\\p{M}", "")
                .replace('đ', 'd')
                .replaceAll("\\s+", " ")
                .trim();
    }

    private boolean containsAny(String text, String... needles) {
        for (String needle : needles) {
            if (text.contains(needle)) {
                return true;
            }
        }
        return false;
    }

    private boolean containsAny(String text, List<String> needles) {
        for (String needle : needles) {
            if (text.contains(needle)) {
                return true;
            }
        }
        return false;
    }

    private String safe(String value) {
        return value == null || value.isBlank() ? "Chưa cập nhật" : value.trim();
    }

    private String safeOrDefault(String value, String defaultValue) {
        return value == null || value.isBlank() ? defaultValue : value.trim();
    }

    private String compact(String message) {
        String trimmed = message == null ? "" : message.trim().replaceAll("\\s+", " ");
        return trimmed.length() <= 500 ? trimmed : trimmed.substring(0, 500);
    }

    private enum ProductType {
        PHONE(
                "điện thoại",
                List.of("dien thoai", "smartphone", "mobile", "phone"),
                List.of("iphone", "galaxy s", "galaxy a", "galaxy z", "galaxy m", "galaxy note",
                        "samsung", "redmi", "poco", "xiaomi", "oppo", "realme", "vivo", "nokia", "pixel"),
                List.of("airpods", "buds", "tai nghe", "headphone", "earbud", "loa", "speaker", "watch",
                        "dong ho", "adapter", "sac", "cap", "op lung", "cuong luc", "ban phim", "keyboard",
                        "chuot", "mouse", "man hinh", "monitor", "case", "phu kien")
        ),
        LAPTOP(
                "laptop",
                List.of("laptop", "may tinh xach tay", "notebook"),
                List.of("macbook", "thinkpad", "vivobook", "ideapad", "pavilion", "inspiron", "xps",
                        "rog", "tuf", "surface laptop", "gram", "msi"),
                List.of("ban phim", "keyboard", "chuot", "mouse", "man hinh", "monitor", "tai nghe",
                        "loa", "adapter", "sac", "phu kien")
        ),
        TABLET(
                "máy tính bảng",
                List.of("tablet", "may tinh bang", "ipad"),
                List.of("ipad", "galaxy tab", "tablet", "matepad", "surface pro"),
                List.of("ban phim", "keyboard", "case", "op lung", "but", "pencil", "phu kien")
        ),
        HEADPHONE(
                "tai nghe",
                List.of("tai nghe", "headphone", "earbud", "earphone", "audio"),
                List.of("airpods", "buds", "sony", "wh-1000", "headphone", "earbuds", "tai nghe"),
                List.of("dien thoai", "laptop", "tablet", "tivi", "man hinh")
        ),
        TV(
                "tivi",
                List.of("tivi", "tv", "television"),
                List.of("tivi", "smart tv", "oled tv", "qled tv"),
                List.of("remote", "gia treo", "cap", "phu kien")
        ),
        MONITOR(
                "màn hình",
                List.of("man hinh", "monitor"),
                List.of("monitor", "ultragear", "odyssey", "viewsonic"),
                List.of("dien thoai", "thay man", "kinh cuong luc", "phu kien")
        ),
        MOUSE(
                "chuột",
                List.of("chuot", "mouse"),
                List.of("chuot", "mouse"),
                List.of()
        ),
        KEYBOARD(
                "bàn phím",
                List.of("ban phim", "keyboard"),
                List.of("ban phim", "keyboard"),
                List.of()
        ),
        SPEAKER(
                "loa",
                List.of("loa", "speaker"),
                List.of("loa", "speaker"),
                List.of()
        ),
        CAMERA(
                "camera",
                List.of("camera", "webcam"),
                List.of("camera", "webcam"),
                List.of("dien thoai", "thay camera")
        );

        private final String label;
        private final List<String> categoryKeywords;
        private final List<String> productKeywords;
        private final List<String> excludedKeywords;

        ProductType(String label, List<String> categoryKeywords, List<String> productKeywords, List<String> excludedKeywords) {
            this.label = label;
            this.categoryKeywords = categoryKeywords;
            this.productKeywords = productKeywords;
            this.excludedKeywords = excludedKeywords;
        }

        private boolean matchesKeyword(String keyword) {
            return categoryKeywords.contains(keyword) || productKeywords.contains(keyword);
        }
    }

    private class ProductIntent {
        private final ProductType type;
        private final String keyword;
        private final List<String> requiredTerms;

        private ProductIntent(ProductType type, String keyword, List<String> requiredTerms) {
            this.type = type;
            this.keyword = keyword;
            this.requiredTerms = requiredTerms == null ? List.of() : requiredTerms;
        }

        private String queryKeyword() {
            if (!requiredTerms.isEmpty()) {
                return requiredTerms.get(0);
            }
            return keyword;
        }

        private String label() {
            String baseLabel = type == null ? "sản phẩm" : type.label;
            if (requiredTerms.isEmpty()) {
                return baseLabel;
            }
            return baseLabel + " " + requiredTerms.stream()
                    .map(ChatbotBusinessAssistantService.this::formatRequiredTerm)
                    .collect(Collectors.joining(", "));
        }

        private boolean hasStrictFilters() {
            return !requiredTerms.isEmpty() || keyword != null;
        }

        private boolean matches(Product product) {
            if (product == null) {
                return false;
            }

            String productText = productSearchText(product);
            String compactText = productText.replaceAll("\\s+", "");
            String name = normalize(safe(product.getName()));
            String category = product.getCategory() == null ? "" : normalize(safe(product.getCategory().getName()));

            if (keyword != null && !productText.contains(keyword)) {
                return false;
            }
            for (String requiredTerm : requiredTerms) {
                if (!compactText.contains(requiredTerm)) {
                    return false;
                }
            }
            if (type == null) {
                return true;
            }
            if (containsAny(productText, type.excludedKeywords)) {
                return false;
            }
            return containsAny(category, type.categoryKeywords) || containsAny(name, type.productKeywords);
        }
    }

    private String productSearchText(Product product) {
        StringBuilder builder = new StringBuilder();
        appendText(builder, product.getName());
        appendText(builder, product.getDescription());
        if (product.getCategory() != null) {
            appendText(builder, product.getCategory().getName());
        }
        if (product.getVariants() != null) {
            for (ProductVariant variant : product.getVariants()) {
                appendText(builder, variant.getName());
            }
        }
        if (product.getAttributeValues() != null) {
            for (ProductAttributeValue attributeValue : product.getAttributeValues()) {
                appendText(builder, attributeValue.getValue());
                if (attributeValue.getAttribute() != null) {
                    appendText(builder, attributeValue.getAttribute().getName());
                    appendText(builder, attributeValue.getAttribute().getCode());
                }
            }
        }
        return normalize(builder.toString());
    }

    private void appendText(StringBuilder builder, String value) {
        if (value != null && !value.isBlank()) {
            builder.append(' ').append(value);
        }
    }

    private String formatRequiredTerm(String term) {
        if (term == null || term.isBlank()) {
            return "";
        }
        return switch (term) {
            case "den" -> "màu đen";
            case "trang" -> "màu trắng";
            case "bac" -> "màu bạc";
            case "vang" -> "màu vàng";
            case "tim" -> "màu tím";
            case "xanh" -> "màu xanh";
            case "hong" -> "màu hồng";
            case "do" -> "màu đỏ";
            case "xam" -> "màu xám";
            case "nau" -> "màu nâu";
            case "kem" -> "màu kem";
            case "cam" -> "màu cam";
            default -> term.toUpperCase(VI_LOCALE);
        };
    }

    private class RepairIntent {
        private final String serviceKeyword;
        private final String phoneTypeKeyword;

        private RepairIntent(String serviceKeyword, String phoneTypeKeyword) {
            this.serviceKeyword = serviceKeyword;
            this.phoneTypeKeyword = phoneTypeKeyword;
        }

        private boolean hasCriteria() {
            return serviceKeyword != null || phoneTypeKeyword != null;
        }

        private String label() {
            if (serviceKeyword != null && phoneTypeKeyword != null) {
                return serviceKeyword + " " + formatRepairPhoneType(phoneTypeKeyword);
            }
            if (serviceKeyword != null) {
                return serviceKeyword;
            }
            if (phoneTypeKeyword != null) {
                return formatRepairPhoneType(phoneTypeKeyword);
            }
            return "";
        }

        private String labelForSentence() {
            String label = label();
            return label.isBlank() ? "" : " " + label;
        }

        private boolean matches(RepairServicePackage item) {
            if (item == null) {
                return false;
            }

            String phoneType = normalize(safe(item.getPhoneType()));
            String serviceText = normalize(safe(item.getServiceName()) + " "
                    + safe(item.getServiceCategory()) + " "
                    + safe(item.getDescription()));

            if (phoneTypeKeyword != null && !phoneType.contains(phoneTypeKeyword)) {
                return false;
            }
            if (serviceKeyword != null && !matchesRepairService(serviceText, serviceKeyword)) {
                return false;
            }
            return true;
        }
    }

    private boolean matchesRepairService(String serviceText, String serviceKeyword) {
        if (serviceText.contains(serviceKeyword)) {
            return true;
        }
        return switch (serviceKeyword) {
            case "pin", "thay pin" -> serviceText.contains("pin");
            case "thay man hinh", "thay man", "vo man hinh", "vo man", "man hinh" -> serviceText.contains("man hinh") || serviceText.contains("man");
            case "cong sac", "chan sac", "sac" -> serviceText.contains("sac") || serviceText.contains("cong sac") || serviceText.contains("chan sac");
            case "micro" -> serviceText.contains("mic") || serviceText.contains("micro");
            case "mat nguon" -> serviceText.contains("nguon");
            default -> false;
        };
    }

    private String formatRepairPhoneType(String phoneTypeKeyword) {
        if (phoneTypeKeyword == null || phoneTypeKeyword.isBlank()) {
            return "";
        }
        return switch (phoneTypeKeyword) {
            case "iphone" -> "iPhone";
            case "ipad" -> "iPad";
            default -> phoneTypeKeyword.substring(0, 1).toUpperCase(VI_LOCALE) + phoneTypeKeyword.substring(1);
        };
    }

    private class BudgetFilter {
        private final Double minPrice;
        private final Double maxPrice;
        private final Double targetPrice;
        private final boolean approximate;

        private BudgetFilter(Double minPrice, Double maxPrice, Double targetPrice, boolean approximate) {
            this.minPrice = minPrice;
            this.maxPrice = maxPrice;
            this.targetPrice = targetPrice;
            this.approximate = approximate;
        }

        private Double minPrice() {
            return minPrice;
        }

        private Double maxPrice() {
            return maxPrice;
        }

        private Double targetPrice() {
            return targetPrice;
        }

        private String describeForReply() {
            if (minPrice != null && maxPrice != null) {
                return " trong khoảng giá " + formatMoney(minPrice) + " - " + formatMoney(maxPrice);
            }
            if (maxPrice != null) {
                return " trong ngân sách tối đa " + formatMoney(maxPrice);
            }
            return "";
        }

        private String describeForNotFound() {
            if (minPrice != null && maxPrice != null) {
                return " trong khoảng giá " + formatMoney(minPrice) + " - " + formatMoney(maxPrice);
            }
            if (maxPrice != null) {
                return " dưới " + formatMoney(maxPrice);
            }
            return "";
        }
    }

    public static class AssistantReply {
        private final String intent;
        private final String content;
        private final boolean handoffRequested;
        private final String handoffReason;

        private AssistantReply(String intent, String content, boolean handoffRequested, String handoffReason) {
            this.intent = intent;
            this.content = content;
            this.handoffRequested = handoffRequested;
            this.handoffReason = handoffReason;
        }

        public static AssistantReply business(String intent, String content) {
            return new AssistantReply(intent, content, false, null);
        }

        public static AssistantReply handoff(String intent, String content, String handoffReason) {
            return new AssistantReply(intent, content, true, handoffReason);
        }

        public String getIntent() {
            return intent;
        }

        public String getContent() {
            return content;
        }

        public boolean isHandoffRequested() {
            return handoffRequested;
        }

        public String getHandoffReason() {
            return handoffReason;
        }
    }
}
