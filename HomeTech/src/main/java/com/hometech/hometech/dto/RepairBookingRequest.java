package com.hometech.hometech.dto;

import com.hometech.hometech.enums.PaymentMethod;
import com.hometech.hometech.enums.RepairBookingStatus;
import com.hometech.hometech.enums.RepairBookingType;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;

public class RepairBookingRequest {
    private Long customerId;
    private Long repairPackageId;
    private String customerName;
    private String phone;
    private String deviceModel;
    private LocalDate appointmentDate;
    private LocalTime appointmentTime;
    private String note;
    private PaymentMethod paymentMethod;
    private RepairBookingStatus status;
    private RepairBookingType bookingType;
    private Double estimatedTradeInAmount;
    private Double tradeInHealthScore;
    private Double tradeInOfferRangeMin;
    private Double tradeInOfferRangeMax;
    private String tradeInConditionName;
    private String tradeInConditionDescription;
    private Integer tradeInBatteryHealth;
    private String tradeInFunctionalStatus;
    private String tradeInVisualStatus;
    private List<Map<String, Object>> tradeInAiImageResults;
    private Map<String, Object> tradeInVideoAnalysis;
    private String tradeInVideoDataUrl;

    public Long getCustomerId() { return customerId; }
    public void setCustomerId(Long customerId) { this.customerId = customerId; }
    public Long getRepairPackageId() { return repairPackageId; }
    public void setRepairPackageId(Long repairPackageId) { this.repairPackageId = repairPackageId; }
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
    public RepairBookingType getBookingType() { return bookingType; }
    public void setBookingType(RepairBookingType bookingType) { this.bookingType = bookingType; }
    public Double getEstimatedTradeInAmount() { return estimatedTradeInAmount; }
    public void setEstimatedTradeInAmount(Double estimatedTradeInAmount) { this.estimatedTradeInAmount = estimatedTradeInAmount; }
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
    public List<Map<String, Object>> getTradeInAiImageResults() { return tradeInAiImageResults; }
    public void setTradeInAiImageResults(List<Map<String, Object>> tradeInAiImageResults) { this.tradeInAiImageResults = tradeInAiImageResults; }
    public Map<String, Object> getTradeInVideoAnalysis() { return tradeInVideoAnalysis; }
    public void setTradeInVideoAnalysis(Map<String, Object> tradeInVideoAnalysis) { this.tradeInVideoAnalysis = tradeInVideoAnalysis; }
    public String getTradeInVideoDataUrl() { return tradeInVideoDataUrl; }
    public void setTradeInVideoDataUrl(String tradeInVideoDataUrl) { this.tradeInVideoDataUrl = tradeInVideoDataUrl; }
}
