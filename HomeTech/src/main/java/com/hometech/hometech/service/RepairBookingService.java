package com.hometech.hometech.service;

import com.hometech.hometech.Repository.CustomerRepository;
import com.hometech.hometech.Repository.RepairBookingRepository;
import com.hometech.hometech.Repository.RepairServicePackageRepository;
import com.hometech.hometech.dto.RepairBookingRequest;
import com.hometech.hometech.enums.PaymentMethod;
import com.hometech.hometech.enums.RepairBookingStatus;
import com.hometech.hometech.model.Customer;
import com.hometech.hometech.model.RepairBooking;
import com.hometech.hometech.model.RepairServicePackage;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

@Service
public class RepairBookingService {

    private final RepairBookingRepository repairBookingRepository;
    private final CustomerRepository customerRepository;
    private final RepairServicePackageRepository repairServicePackageRepository;

    public RepairBookingService(RepairBookingRepository repairBookingRepository,
                                CustomerRepository customerRepository,
                                RepairServicePackageRepository repairServicePackageRepository) {
        this.repairBookingRepository = repairBookingRepository;
        this.customerRepository = customerRepository;
        this.repairServicePackageRepository = repairServicePackageRepository;
    }

    public RepairBooking createBooking(RepairBookingRequest request) {
        validateRequest(request, false);
        RepairBooking booking = buildBookingFromRequest(new RepairBooking(), request, false);
        return repairBookingRepository.save(booking);
    }

    public RepairBooking createBookingByAdmin(RepairBookingRequest request) {
        validateRequest(request, true);
        RepairBooking booking = buildBookingFromRequest(new RepairBooking(), request, true);
        return repairBookingRepository.save(booking);
    }

    public RepairBooking updateBookingByAdmin(Long bookingId, RepairBookingRequest request) {
        validateRequest(request, true);
        RepairBooking existing = getBookingById(bookingId);
        RepairBooking updated = buildBookingFromRequest(existing, request, true);
        return repairBookingRepository.save(updated);
    }

    public void deleteBookingByAdmin(Long bookingId) {
        RepairBooking existing = getBookingById(bookingId);
        repairBookingRepository.delete(existing);
    }

    public RepairBooking getBookingById(Long id) {
        return repairBookingRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy lịch sửa chữa"));
    }

    public List<RepairBooking> getAllBookingsForAdmin() {
        return repairBookingRepository.findAllByOrderByAppointmentDateAscAppointmentTimeAsc();
    }

    public List<RepairBooking> getBookingHistory(Long customerId) {
        return repairBookingRepository.findByCustomerIdOrderByCreatedAtDesc(customerId);
    }

    public RepairBooking markPaidByTxnRef(String txnRef, String checkoutUrl) {
        RepairBooking booking = repairBookingRepository.findByPaymentTxnRef(txnRef)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy lịch sửa chữa theo giao dịch"));
        booking.setStatus(RepairBookingStatus.PAID);
        if (checkoutUrl != null) {
            booking.setPaymentCheckoutUrl(checkoutUrl);
        }
        return repairBookingRepository.save(booking);
    }

    public RepairBooking save(RepairBooking booking) {
        return repairBookingRepository.save(booking);
    }

    private RepairBooking buildBookingFromRequest(RepairBooking booking, RepairBookingRequest request, boolean adminMode) {
        Customer customer = customerRepository.findById(request.getCustomerId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy khách hàng"));

        RepairServicePackage pkg = repairServicePackageRepository.findById(request.getRepairPackageId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy gói dịch vụ"));

        if (!Boolean.TRUE.equals(pkg.getActive()) && !adminMode) {
            throw new RuntimeException("Gói dịch vụ hiện không hoạt động");
        }

        booking.setCustomer(customer);
        booking.setRepairServicePackage(pkg);
        booking.setCustomerName(request.getCustomerName().trim());
        booking.setPhone(request.getPhone().trim());
        booking.setDeviceModel(request.getDeviceModel().trim());
        booking.setAppointmentDate(request.getAppointmentDate());
        booking.setAppointmentTime(request.getAppointmentTime());
        booking.setNote(request.getNote());
        booking.setPaymentMethod(request.getPaymentMethod());
        booking.setTotalAmount(pkg.getPrice().doubleValue());

        if (adminMode && request.getStatus() != null) {
            booking.setStatus(request.getStatus());
        } else if (request.getPaymentMethod() == PaymentMethod.COD) {
            booking.setStatus(RepairBookingStatus.PENDING);
        } else {
            booking.setStatus(RepairBookingStatus.WAITING_PAYMENT);
        }

        return booking;
    }

    private void validateRequest(RepairBookingRequest request, boolean adminMode) {
        if (request.getCustomerId() == null) throw new RuntimeException("Thiếu customerId");
        if (request.getRepairPackageId() == null) throw new RuntimeException("Thiếu repairPackageId");
        if (request.getCustomerName() == null || request.getCustomerName().trim().isEmpty()) throw new RuntimeException("Tên khách hàng không được để trống");
        if (request.getPhone() == null || request.getPhone().trim().isEmpty()) throw new RuntimeException("Số điện thoại không được để trống");
        if (request.getDeviceModel() == null || request.getDeviceModel().trim().isEmpty()) throw new RuntimeException("Dòng máy không được để trống");
        if (request.getAppointmentDate() == null) throw new RuntimeException("Ngày hẹn không hợp lệ");
        if (!adminMode && request.getAppointmentDate().isBefore(LocalDate.now())) throw new RuntimeException("Ngày hẹn không hợp lệ");
        if (request.getAppointmentTime() == null) throw new RuntimeException("Giờ hẹn không được để trống");
        if (request.getPaymentMethod() == null) throw new RuntimeException("Thiếu phương thức thanh toán");
        if (request.getPaymentMethod() != PaymentMethod.COD
                && request.getPaymentMethod() != PaymentMethod.VNPAY
                && request.getPaymentMethod() != PaymentMethod.PAYOS) {
            throw new RuntimeException("Phương thức thanh toán không hỗ trợ cho sửa chữa");
        }
    }
}
