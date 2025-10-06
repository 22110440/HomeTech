package com.hometech.hometech.model;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
@Entity
@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
public class Address {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int addressId;

    // Khóa ngoại đến Customer
    @OneToOne
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    private String addressLine;
    private String commune;
    private String city;
}
