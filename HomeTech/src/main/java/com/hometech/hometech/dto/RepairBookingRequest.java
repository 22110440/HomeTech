package com.hometech.hometech.dto;

import com.hometech.hometech.enums.PaymentMethod;
import com.hometech.hometech.enums.RepairBookingStatus;

import java.time.LocalDate;
import java.time.LocalTime;

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
}
