package com.hometech.hometech.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hometech.hometech.Repository.AccountRepository;
import com.hometech.hometech.Repository.CustomerRepository;
import com.hometech.hometech.Repository.RepairBookingRepository;
import com.hometech.hometech.Repository.RepairServicePackageRepository;
import com.hometech.hometech.dto.RepairBookingProgressRequest;
import com.hometech.hometech.dto.RepairBookingRequest;
import com.hometech.hometech.enums.PaymentMethod;
import com.hometech.hometech.enums.RepairBookingStatus;
import com.hometech.hometech.enums.RepairBookingType;
import com.hometech.hometech.model.Account;
import com.hometech.hometech.model.Customer;
import com.hometech.hometech.model.RepairBooking;
import com.hometech.hometech.model.RepairServicePackage;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.EnumSet;
import java.util.List;

@Service
public class RepairBookingService {

    private static final EnumSet<RepairBookingStatus> TERMINAL_STATUSES = EnumSet.of(
            RepairBookingStatus.COMPLETED,
            RepairBookingStatus.CANCELLED,
            RepairBookingStatus.FAILED
    );

    private final RepairBookingRepository repairBookingRepository;
    private final CustomerRepository customerRepository;
    private final RepairServicePackageRepository repairServicePackageRepository;
    private final AccountRepository accountRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public RepairBookingService(RepairBookingRepository repairBookingRepository,
                                CustomerRepository customerRepository,
                                RepairServicePackageRepository repairServicePackageRepository,
                                AccountRepository accountRepository) {
        this.repairBookingRepository = repairBookingRepository;
        this.customerRepository = customerRepository;
        this.repairServicePackageRepository = repairServicePackageRepository;
        this.accountRepository = accountRepository;
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
                .orElseThrow(() -> new RuntimeException("Khong tim thay lich hen"));
    }

    public List<RepairBooking> getAllBookingsForAdmin() {
        return repairBookingRepository.findAllByOrderByAppointmentDateAscAppointmentTimeAsc();
    }

    public List<RepairBooking> getBookingHistory(Long customerId) {
        return repairBookingRepository.findByCustomerIdOrderByCreatedAtDesc(customerId);
    }

    public RepairBooking markPaidByTxnRef(String txnRef, String checkoutUrl) {
        RepairBooking booking = repairBookingRepository.findByPaymentTxnRef(txnRef)
                .orElseThrow(() -> new RuntimeException("Khong tim thay lich hen theo giao dich"));
        if (booking.getBookingType() == RepairBookingType.TRADE_IN) {
            throw new RuntimeException("Lich thu cu doi moi khong ho tro cong thanh toan nay");
        }
        booking.setStatus(RepairBookingStatus.PAID);
        if (checkoutUrl != null) {
            booking.setPaymentCheckoutUrl(checkoutUrl);
        }
        return repairBookingRepository.save(booking);
    }

    public RepairBooking updatePaymentMethod(Long bookingId, PaymentMethod paymentMethod) {
        if (paymentMethod == null) {
            throw new RuntimeException("Thieu phuong thuc thanh toan");
        }

        RepairBooking booking = getBookingById(bookingId);
        if (booking.getBookingType() == RepairBookingType.TRADE_IN) {
            booking.setPaymentMethod(PaymentMethod.COD);
            booking.setStatus(RepairBookingStatus.PENDING);
            booking.setPaymentTxnRef(null);
            booking.setPaymentCheckoutUrl(null);
            return repairBookingRepository.save(booking);
        }

        booking.setPaymentMethod(paymentMethod);
        booking.setPaymentTxnRef(null);
        booking.setPaymentCheckoutUrl(null);

        if (paymentMethod == PaymentMethod.COD) {
            booking.setStatus(RepairBookingStatus.PENDING);
        } else if (booking.getStatus() != RepairBookingStatus.PAID) {
            booking.setStatus(RepairBookingStatus.WAITING_PAYMENT);
        }

        return repairBookingRepository.save(booking);
    }

    public RepairBooking save(RepairBooking booking) {
        return repairBookingRepository.save(booking);
    }

    public RepairBooking updateProgress(Long bookingId, RepairBookingProgressRequest request, String actorUsername) {
        if (request == null || request.getStatus() == null) {
            throw new RuntimeException("Thieu trang thai tien trinh");
        }

        RepairBooking booking = getBookingById(bookingId);
        if (isTerminalStatus(booking.getStatus())) {
            throw new RuntimeException("Lich hen da ket thuc, khong the cap nhat them");
        }
        if (actorUsername == null || actorUsername.isBlank()) {
            throw new RuntimeException("Khong xac dinh duoc tai khoan cap nhat tien trinh");
        }
        validateProgressStatus(booking, request.getStatus());

        Account technician = accountRepository.findByUsername(actorUsername)
                .or(() -> accountRepository.findByEmail(actorUsername))
                .orElseThrow(() -> new RuntimeException("Khong tim thay tai khoan tho"));

        booking.setTechnicianAccount(technician);
        booking.setTechnicianName(technician.getUsername());
        booking.setProgressNote(trimToNull(request.getProgressNote()));
        applyTradeInProgressFields(booking, request);

        if (request.getStatus() == RepairBookingStatus.IN_PROGRESS && booking.getStartedAt() == null) {
            booking.setStartedAt(LocalDateTime.now());
        }

        if (request.getStatus() == RepairBookingStatus.COMPLETED || request.getStatus() == RepairBookingStatus.FAILED) {
            booking.setCompletedAt(LocalDateTime.now());
            if (booking.getStartedAt() == null) {
                booking.setStartedAt(LocalDateTime.now());
            }
        }

        if (request.getStatus() == RepairBookingStatus.CANCELLED) {
            booking.setCompletedAt(LocalDateTime.now());
        }

        booking.setStatus(request.getStatus());
        return repairBookingRepository.save(booking);
    }

    private RepairBooking buildBookingFromRequest(RepairBooking booking, RepairBookingRequest request, boolean adminMode) {
        Customer customer = customerRepository.findById(request.getCustomerId())
                .orElseThrow(() -> new RuntimeException("Khong tim thay khach hang"));

        RepairBookingType bookingType = request.getBookingType() == null ? RepairBookingType.REPAIR : request.getBookingType();
        RepairServicePackage pkg = null;
        boolean isNew = booking.getId() == null;

        if (bookingType == RepairBookingType.REPAIR) {
            pkg = repairServicePackageRepository.findById(request.getRepairPackageId())
                    .orElseThrow(() -> new RuntimeException("Khong tim thay goi dich vu"));

            if (!Boolean.TRUE.equals(pkg.getActive()) && !adminMode) {
                throw new RuntimeException("Goi dich vu hien khong hoat dong");
            }
        }

        booking.setCustomer(customer);
        booking.setBookingType(bookingType);
        booking.setRepairServicePackage(pkg);
        booking.setCustomerName(request.getCustomerName().trim());
        booking.setPhone(request.getPhone().trim());
        booking.setDeviceModel(request.getDeviceModel().trim());
        booking.setAppointmentDate(request.getAppointmentDate());
        booking.setAppointmentTime(request.getAppointmentTime());
        booking.setNote(trimToNull(request.getNote()));

        if (bookingType == RepairBookingType.TRADE_IN) {
            booking.setPaymentMethod(PaymentMethod.COD);
            booking.setEstimatedTradeInAmount(request.getEstimatedTradeInAmount());
            booking.setTotalAmount(request.getEstimatedTradeInAmount() == null ? 0D : request.getEstimatedTradeInAmount());
            if (isNew) {
                booking.setFinalTradeInAmount(null);
            }
            if (request.getTradeInHealthScore() != null || isNew) {
                booking.setTradeInHealthScore(request.getTradeInHealthScore());
            }
            if (request.getTradeInOfferRangeMin() != null || isNew) {
                booking.setTradeInOfferRangeMin(request.getTradeInOfferRangeMin());
            }
            if (request.getTradeInOfferRangeMax() != null || isNew) {
                booking.setTradeInOfferRangeMax(request.getTradeInOfferRangeMax());
            }
            if (request.getTradeInConditionName() != null || isNew) {
                booking.setTradeInConditionName(trimToNull(request.getTradeInConditionName()));
            }
            if (request.getTradeInConditionDescription() != null || isNew) {
                booking.setTradeInConditionDescription(trimToNull(request.getTradeInConditionDescription()));
            }
            if (request.getTradeInBatteryHealth() != null || isNew) {
                booking.setTradeInBatteryHealth(request.getTradeInBatteryHealth());
            }
            if (request.getTradeInFunctionalStatus() != null || isNew) {
                booking.setTradeInFunctionalStatus(trimToNull(request.getTradeInFunctionalStatus()));
            }
            if (request.getTradeInVisualStatus() != null || isNew) {
                booking.setTradeInVisualStatus(trimToNull(request.getTradeInVisualStatus()));
            }
            if (request.getTradeInAiImageResults() != null || isNew) {
                booking.setTradeInAiImageResultsJson(writeJson(request.getTradeInAiImageResults()));
            }
            if (request.getTradeInVideoAnalysis() != null || isNew) {
                booking.setTradeInVideoAnalysisJson(writeJson(request.getTradeInVideoAnalysis()));
            }
            if (request.getTradeInVideoDataUrl() != null || isNew) {
                booking.setTradeInVideoDataUrl(trimToNull(request.getTradeInVideoDataUrl()));
            }
            booking.setPaymentTxnRef(null);
            booking.setPaymentCheckoutUrl(null);
        } else {
            booking.setPaymentMethod(request.getPaymentMethod());
            booking.setEstimatedTradeInAmount(null);
            booking.setFinalTradeInAmount(null);
            booking.setTradeInHealthScore(null);
            booking.setTradeInOfferRangeMin(null);
            booking.setTradeInOfferRangeMax(null);
            booking.setTradeInConditionName(null);
            booking.setTradeInConditionDescription(null);
            booking.setTradeInBatteryHealth(null);
            booking.setTradeInFunctionalStatus(null);
            booking.setTradeInVisualStatus(null);
            booking.setTradeInInspectionImagesJson(null);
            booking.setTradeInAiImageResultsJson(null);
            booking.setTradeInVideoAnalysisJson(null);
            booking.setTradeInVideoDataUrl(null);
            booking.setTotalAmount(pkg.getPrice().doubleValue());
        }

        if (adminMode) {
            if (request.getStatus() != null) {
                booking.setStatus(request.getStatus());
            } else if (isNew) {
                booking.setStatus(bookingType == RepairBookingType.TRADE_IN || booking.getPaymentMethod() == PaymentMethod.COD
                        ? RepairBookingStatus.PENDING
                        : RepairBookingStatus.WAITING_PAYMENT);
            }
        } else if (bookingType == RepairBookingType.TRADE_IN || booking.getPaymentMethod() == PaymentMethod.COD) {
            booking.setStatus(RepairBookingStatus.PENDING);
        } else {
            booking.setStatus(RepairBookingStatus.WAITING_PAYMENT);
        }

        return booking;
    }

    private void validateRequest(RepairBookingRequest request, boolean adminMode) {
        RepairBookingType bookingType = request.getBookingType() == null ? RepairBookingType.REPAIR : request.getBookingType();
        if (request.getCustomerId() == null) {
            throw new RuntimeException("Thieu customerId");
        }
        if (bookingType == RepairBookingType.REPAIR && request.getRepairPackageId() == null) {
            throw new RuntimeException("Thieu repairPackageId");
        }
        if (request.getCustomerName() == null || request.getCustomerName().trim().isEmpty()) {
            throw new RuntimeException("Ten khach hang khong duoc de trong");
        }
        if (request.getPhone() == null || request.getPhone().trim().isEmpty()) {
            throw new RuntimeException("So dien thoai khong duoc de trong");
        }
        if (request.getDeviceModel() == null || request.getDeviceModel().trim().isEmpty()) {
            throw new RuntimeException("Kieu may khong duoc de trong");
        }
        if (request.getAppointmentDate() == null) {
            throw new RuntimeException("Ngay hen khong hop le");
        }
        if (!adminMode && request.getAppointmentDate().isBefore(LocalDate.now())) {
            throw new RuntimeException("Ngay hen khong hop le");
        }
        if (request.getAppointmentTime() == null) {
            throw new RuntimeException("Gio hen khong duoc de trong");
        }

        if (bookingType == RepairBookingType.REPAIR) {
            if (request.getPaymentMethod() == null) {
                throw new RuntimeException("Thieu phuong thuc thanh toan");
            }
            if (request.getPaymentMethod() != PaymentMethod.COD
                    && request.getPaymentMethod() != PaymentMethod.VNPAY
                    && request.getPaymentMethod() != PaymentMethod.PAYOS) {
                throw new RuntimeException("Phuong thuc thanh toan khong ho tro cho sua chua");
            }
        } else if (request.getEstimatedTradeInAmount() == null || request.getEstimatedTradeInAmount() < 0) {
            throw new RuntimeException("Thieu gia uoc luong cho thu cu doi moi");
        }
    }

    private void applyTradeInProgressFields(RepairBooking booking, RepairBookingProgressRequest request) {
        if (booking.getBookingType() != RepairBookingType.TRADE_IN || request == null) {
            return;
        }

        if (request.getEstimatedTradeInAmount() != null) {
            booking.setEstimatedTradeInAmount(request.getEstimatedTradeInAmount());
        }
        if (request.getFinalTradeInAmount() != null) {
            booking.setFinalTradeInAmount(request.getFinalTradeInAmount());
            booking.setTotalAmount(request.getFinalTradeInAmount());
        } else if (request.getEstimatedTradeInAmount() != null) {
            booking.setTotalAmount(request.getEstimatedTradeInAmount());
        }
        if (request.getTradeInHealthScore() != null) {
            booking.setTradeInHealthScore(request.getTradeInHealthScore());
        }
        if (request.getTradeInConditionName() != null) {
            booking.setTradeInConditionName(trimToNull(request.getTradeInConditionName()));
        }
        if (request.getTradeInConditionDescription() != null) {
            booking.setTradeInConditionDescription(trimToNull(request.getTradeInConditionDescription()));
        }
        if (request.getTradeInBatteryHealth() != null) {
            booking.setTradeInBatteryHealth(request.getTradeInBatteryHealth());
        }
        if (request.getTradeInFunctionalStatus() != null) {
            booking.setTradeInFunctionalStatus(trimToNull(request.getTradeInFunctionalStatus()));
        }
        if (request.getTradeInVisualStatus() != null) {
            booking.setTradeInVisualStatus(trimToNull(request.getTradeInVisualStatus()));
        }
        if (request.getTradeInInspectionImages() != null) {
            booking.setTradeInInspectionImagesJson(writeJson(request.getTradeInInspectionImages()));
        }
    }

    private void validateProgressStatus(RepairBooking booking, RepairBookingStatus nextStatus) {
        if (booking.getBookingType() == RepairBookingType.TRADE_IN
                && (nextStatus == RepairBookingStatus.PAID || nextStatus == RepairBookingStatus.WAITING_PAYMENT)) {
            throw new RuntimeException("Lich thu cu doi moi khong dung trang thai thanh toan");
        }
    }

    private boolean isTerminalStatus(RepairBookingStatus status) {
        return status != null && TERMINAL_STATUSES.contains(status);
    }

    private String writeJson(Object value) {
        if (value == null) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException ex) {
            throw new RuntimeException("Khong the luu du lieu thu cu doi moi", ex);
        }
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
