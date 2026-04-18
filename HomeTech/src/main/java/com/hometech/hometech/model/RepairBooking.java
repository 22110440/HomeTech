package com.hometech.hometech.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.hometech.hometech.enums.PaymentMethod;
import com.hometech.hometech.enums.RepairBookingStatus;
import com.hometech.hometech.enums.RepairBookingType;
import jakarta.persistence.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Entity
@Table(name = "repair_bookings")
public class RepairBooking {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "repair_package_id")
    private RepairServicePackage repairServicePackage;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private RepairBookingType bookingType;

    @Column(nullable = false, length = 150)
    private String customerName;

    @Column(nullable = false, length = 20)
    private String phone;

    @Column(nullable = false, length = 100)
    private String deviceModel;

    @Column(nullable = false)
    private LocalDate appointmentDate;

    @Column(nullable = false)
    private LocalTime appointmentTime;

    @Column(length = 1000)
    private String note;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PaymentMethod paymentMethod;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private RepairBookingStatus status;

    @Column(nullable = false)
    private Double totalAmount;

    private Double estimatedTradeInAmount;

    private Double finalTradeInAmount;

    private Double tradeInHealthScore;

    private Double tradeInOfferRangeMin;

    private Double tradeInOfferRangeMax;

    @Column(length = 150)
    private String tradeInConditionName;

    @Column(length = 2000)
    private String tradeInConditionDescription;

    private Integer tradeInBatteryHealth;

    @Column(length = 2000)
    private String tradeInFunctionalStatus;

    @Column(length = 2000)
    private String tradeInVisualStatus;

    @Lob
    @Column(columnDefinition = "LONGTEXT")
    private String tradeInInspectionImagesJson;

    @Lob
    @Column(columnDefinition = "LONGTEXT")
    private String tradeInAiImageResultsJson;

    @Lob
    @Column(columnDefinition = "LONGTEXT")
    private String tradeInVideoAnalysisJson;

    @Lob
    @Column(columnDefinition = "LONGTEXT")
    private String tradeInVideoDataUrl;

    @Column(length = 255)
    private String paymentTxnRef;

    @Column(length = 2000)
    private String paymentCheckoutUrl;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "technician_account_id")
    private Account technicianAccount;

    @Column(length = 150)
    private String technicianName;

    @Column(length = 1000)
    private String progressNote;

    private LocalDateTime startedAt;

    private LocalDateTime completedAt;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    public void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    public void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Customer getCustomer() { return customer; }
    public void setCustomer(Customer customer) { this.customer = customer; }
    public RepairServicePackage getRepairServicePackage() { return repairServicePackage; }
    public void setRepairServicePackage(RepairServicePackage repairServicePackage) { this.repairServicePackage = repairServicePackage; }
    public RepairBookingType getBookingType() { return bookingType; }
    public void setBookingType(RepairBookingType bookingType) { this.bookingType = bookingType; }
    public String getCustomerName() { return customerName; }
    public void setCustomerName(String customerName) { this.customerName = customerName; }
    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
    public String getDeviceModel() { return deviceModel; }
    public void setDeviceModel(String deviceModel) { this.deviceModel = deviceModel; }
    public LocalDate getAppointmentDate() { return appointmentDate; }
    public void setAppointmentDate(LocalDate appointmentDate) { this.appointmentDate = appointmentDate; }
    public LocalTime getAppointmentTime() { return appointmentTime; }
    public void setAppointmentTime(LocalTime appointmentTime) { this.appointmentTime = appointmentTime; }
    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }
    public PaymentMethod getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(PaymentMethod paymentMethod) { this.paymentMethod = paymentMethod; }
    public RepairBookingStatus getStatus() { return status; }
    public void setStatus(RepairBookingStatus status) { this.status = status; }
    public Double getTotalAmount() { return totalAmount; }
    public void setTotalAmount(Double totalAmount) { this.totalAmount = totalAmount; }
    public Double getEstimatedTradeInAmount() { return estimatedTradeInAmount; }
    public void setEstimatedTradeInAmount(Double estimatedTradeInAmount) { this.estimatedTradeInAmount = estimatedTradeInAmount; }
    public Double getFinalTradeInAmount() { return finalTradeInAmount; }
    public void setFinalTradeInAmount(Double finalTradeInAmount) { this.finalTradeInAmount = finalTradeInAmount; }
    public Double getTradeInHealthScore() { return tradeInHealthScore; }
    public void setTradeInHealthScore(Double tradeInHealthScore) { this.tradeInHealthScore = tradeInHealthScore; }
    public Double getTradeInOfferRangeMin() { return tradeInOfferRangeMin; }
    public void setTradeInOfferRangeMin(Double tradeInOfferRangeMin) { this.tradeInOfferRangeMin = tradeInOfferRangeMin; }
    public Double getTradeInOfferRangeMax() { return tradeInOfferRangeMax; }
    public void setTradeInOfferRangeMax(Double tradeInOfferRangeMax) { this.tradeInOfferRangeMax = tradeInOfferRangeMax; }
    public String getTradeInConditionName() { return tradeInConditionName; }
    public void setTradeInConditionName(String tradeInConditionName) { this.tradeInConditionName = tradeInConditionName; }
    public String getTradeInConditionDescription() { return tradeInConditionDescription; }
    public void setTradeInConditionDescription(String tradeInConditionDescription) { this.tradeInConditionDescription = tradeInConditionDescription; }
    public Integer getTradeInBatteryHealth() { return tradeInBatteryHealth; }
    public void setTradeInBatteryHealth(Integer tradeInBatteryHealth) { this.tradeInBatteryHealth = tradeInBatteryHealth; }
    public String getTradeInFunctionalStatus() { return tradeInFunctionalStatus; }
    public void setTradeInFunctionalStatus(String tradeInFunctionalStatus) { this.tradeInFunctionalStatus = tradeInFunctionalStatus; }
    public String getTradeInVisualStatus() { return tradeInVisualStatus; }
    public void setTradeInVisualStatus(String tradeInVisualStatus) { this.tradeInVisualStatus = tradeInVisualStatus; }
    public String getTradeInInspectionImagesJson() { return tradeInInspectionImagesJson; }
    public void setTradeInInspectionImagesJson(String tradeInInspectionImagesJson) { this.tradeInInspectionImagesJson = tradeInInspectionImagesJson; }
    public String getTradeInAiImageResultsJson() { return tradeInAiImageResultsJson; }
    public void setTradeInAiImageResultsJson(String tradeInAiImageResultsJson) { this.tradeInAiImageResultsJson = tradeInAiImageResultsJson; }
    public String getTradeInVideoAnalysisJson() { return tradeInVideoAnalysisJson; }
    public void setTradeInVideoAnalysisJson(String tradeInVideoAnalysisJson) { this.tradeInVideoAnalysisJson = tradeInVideoAnalysisJson; }
    public String getTradeInVideoDataUrl() { return tradeInVideoDataUrl; }
    public void setTradeInVideoDataUrl(String tradeInVideoDataUrl) { this.tradeInVideoDataUrl = tradeInVideoDataUrl; }
    public String getPaymentTxnRef() { return paymentTxnRef; }
    public void setPaymentTxnRef(String paymentTxnRef) { this.paymentTxnRef = paymentTxnRef; }
    public String getPaymentCheckoutUrl() { return paymentCheckoutUrl; }
    public void setPaymentCheckoutUrl(String paymentCheckoutUrl) { this.paymentCheckoutUrl = paymentCheckoutUrl; }
    public Account getTechnicianAccount() { return technicianAccount; }
    public void setTechnicianAccount(Account technicianAccount) { this.technicianAccount = technicianAccount; }
    public String getTechnicianName() { return technicianName; }
    public void setTechnicianName(String technicianName) { this.technicianName = technicianName; }
    public String getProgressNote() { return progressNote; }
    public void setProgressNote(String progressNote) { this.progressNote = progressNote; }
    public LocalDateTime getStartedAt() { return startedAt; }
    public void setStartedAt(LocalDateTime startedAt) { this.startedAt = startedAt; }
    public LocalDateTime getCompletedAt() { return completedAt; }
    public void setCompletedAt(LocalDateTime completedAt) { this.completedAt = completedAt; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
