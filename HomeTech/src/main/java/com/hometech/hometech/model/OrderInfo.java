package com.hometech.hometech.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "order_info")
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class OrderInfo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String fullName;
    private String email;
    private String phone;
    private String street;
    private String ward;
    private String district;
    private String city;

    public String getFullAddress() {
        StringBuilder builder = new StringBuilder();
        if (street != null && !street.isBlank()) builder.append(street);
        if (ward != null && !ward.isBlank()) {
            if (builder.length() > 0) builder.append(", ");
            builder.append(ward);
        }
        if (district != null && !district.isBlank()) {
            if (builder.length() > 0) builder.append(", ");
            builder.append(district);
        }
        if (city != null && !city.isBlank()) {
            if (builder.length() > 0) builder.append(", ");
            builder.append(city);
        }
        return builder.length() == 0 ? "-" : builder.toString();
    }
}

