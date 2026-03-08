package com.hometech.hometech.config;

import com.hometech.hometech.Repository.RepairServicePackageRepository;
import com.hometech.hometech.model.RepairServicePackage;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.math.BigDecimal;

@Configuration
public class RepairPackageDataInitializer {

    @Bean
    CommandLineRunner initRepairPackages(RepairServicePackageRepository repo) {
        return args -> {
            if (repo.count() > 0) return;

            RepairServicePackage p1 = new RepairServicePackage();
            p1.setServiceName("Sửa pin iPhone X");
            p1.setPhoneType("iPhone X");
            p1.setServiceCategory("Thay pin");
            p1.setDescription("Thay pin dung lượng chuẩn cho iPhone X, kiểm tra chai pin và test sạc.");
            p1.setImageUrl("https://images.unsplash.com/photo-1580910051074-3eb694886505?auto=format&fit=crop&w=1200&q=80");
            p1.setPrice(new BigDecimal("450000"));
            p1.setEstimatedDurationMinutes(60);
            p1.setActive(true);

            RepairServicePackage p2 = new RepairServicePackage();
            p2.setServiceName("Sửa màn hình iPhone X");
            p2.setPhoneType("iPhone X");
            p2.setServiceCategory("Thay màn hình");
            p2.setDescription("Thay màn hình, test cảm ứng và hiển thị.");
            p2.setImageUrl("https://images.unsplash.com/photo-1616410011236-7a42121dd981?auto=format&fit=crop&w=1200&q=80");
            p2.setPrice(new BigDecimal("1200000"));
            p2.setEstimatedDurationMinutes(120);
            p2.setActive(true);

            repo.save(p1);
            repo.save(p2);
        };
    }
}
