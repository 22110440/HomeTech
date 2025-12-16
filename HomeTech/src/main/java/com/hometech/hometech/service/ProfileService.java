package com.hometech.hometech.service;

import com.hometech.hometech.Repository.AddressRepository;
import com.hometech.hometech.Repository.CustomerRepository;
import com.hometech.hometech.Repository.UserRepository;
import com.hometech.hometech.dto.UpdateProfileDTO;
import com.hometech.hometech.model.Account;
import com.hometech.hometech.model.Address;
import com.hometech.hometech.model.Customer;
import com.hometech.hometech.model.User;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.Date;

@Service
public class ProfileService {

    private final CustomerRepository customerRepository;
    private final UserRepository userRepository;
    private final AddressRepository addressRepository;
    private final NotifyService notifyService;

    public ProfileService(CustomerRepository customerRepository,
                          UserRepository userRepository,
                          AddressRepository addressRepository,
                          NotifyService notifyService) {
        this.customerRepository = customerRepository;
        this.userRepository = userRepository;
        this.addressRepository = addressRepository;
        this.notifyService = notifyService;
    }

    // ===================================================================
    // 🟢 CẬP NHẬT HỒ SƠ
    // ===================================================================
    @Transactional
    public User updateOrCreateProfile(Long userId, UpdateProfileDTO dto, MultipartFile pictureFile) throws IOException {
        // Vì Customer kế thừa User => lấy Customer thay vì User
        Customer customer = customerRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Customer không tồn tại"));

        // Cập nhật thông tin User
        customer.setFullName(dto.getFullName());
        customer.setPhone(dto.getPhone());

        // Email nằm trong Account → cập nhật nếu có
        Account account = customer.getAccount();
        if (dto.getEmail() != null && !dto.getEmail().isEmpty() && account != null) {
            account.setEmail(dto.getEmail());
        }

        // Xử lý ảnh đại diện
        if (pictureFile != null && !pictureFile.isEmpty()) {
            customer.setPictureBlob(pictureFile.getBytes());
            customer.setPictureContentType(pictureFile.getContentType());
        }

        // Cập nhật ngày sinh
        if (dto.getDateOfBirth() != null && !dto.getDateOfBirth().isEmpty()) {
            try {
                Date dob = new SimpleDateFormat("yyyy-MM-dd").parse(dto.getDateOfBirth());
                customer.setDateOfBirth(dob);
            } catch (Exception e) {
                throw new RuntimeException("Ngày sinh không hợp lệ (yyyy-MM-dd)");
            }
        }

        // Cập nhật địa chỉ
        Address address = findOrCreateDefaultAddress(customer);
        if (dto.getAddressLine() != null) address.setStreet(dto.getAddressLine());
        if (dto.getCommune() != null) address.setWard(dto.getCommune());
        if (dto.getDistrict() != null) address.setDistrict(dto.getDistrict());
        if (dto.getCity() != null) address.setCity(dto.getCity());

        address.setCustomer(customer);
        address = addressRepository.save(address);
        customer.getAddresses().clear();
        customer.getAddresses().add(address);

        customerRepository.save(customer);
        try {
            notifyService.createNotification(customer.getId(),
                    "Thông tin cá nhân của bạn đã được cập nhật",
                    "PROFILE_UPDATE",
                    customer.getId());
        } catch (Exception e) {
            System.err.println("❌ Failed to send profile notification: " + e.getMessage());
        }
        return customer;
    }

    // ===================================================================
    // 🟡 LẤY HỒ SƠ
    // ===================================================================
    public UpdateProfileDTO getProfile(Long userId) {
        Customer customer = customerRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy Customer"));

        UpdateProfileDTO dto = new UpdateProfileDTO();
        dto.setFullName(customer.getFullName());
        dto.setPhone(customer.getPhone());

        // Email từ Account
        if (customer.getAccount() != null) {
            dto.setEmail(customer.getAccount().getEmail());
        }

        // Ảnh BLOB → Base64
        if (customer.getPictureBlob() != null && customer.getPictureContentType() != null) {
            String base64 = java.util.Base64.getEncoder().encodeToString(customer.getPictureBlob());
            dto.setPictureUrl("data:" + customer.getPictureContentType() + ";base64," + base64);
        }

        // Ngày sinh
        if (customer.getDateOfBirth() != null) {
            dto.setDateOfBirth(new SimpleDateFormat("yyyy-MM-dd").format(customer.getDateOfBirth()));
        }

        // Địa chỉ
        if (!customer.getAddresses().isEmpty()) {
            Address a = customer.getAddresses().get(0);
            dto.setAddressLine(a.getStreet());
            dto.setCommune(a.getWard());
            dto.setDistrict(a.getDistrict());
            dto.setCity(a.getCity());
        }

        return dto;
    }

    // ===================================================================
    // 🟣 UPLOAD ẢNH
    // ===================================================================
    @Transactional
    public String uploadProfileImage(Long userId, MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new RuntimeException("File không được để trống");
        }

        Customer customer = customerRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Customer không tồn tại"));

        customer.setPictureBlob(file.getBytes());
        customer.setPictureContentType(file.getContentType());
        customerRepository.save(customer);

        return "Upload ảnh thành công!";
    }

    // ===================================================================
    // 🧩 LẤY ẢNH
    // ===================================================================
    public byte[] getProfileImage(Long userId) {
        Customer customer = customerRepository.findById(userId).orElse(null);
        return customer != null ? customer.getPictureBlob() : null;
    }

    public String getProfileImageContentType(Long userId) {
        Customer customer = customerRepository.findById(userId).orElse(null);
        return customer != null ? customer.getPictureContentType() : null;
    }

    // ===================================================================
    // 🔧 Helper
    // ===================================================================
    private Address findOrCreateDefaultAddress(Customer customer) {
        return customer.getAddresses().stream()
                .findFirst()
                .orElseGet(() -> {
                    Address a = new Address();
                    a.setStreet("Chưa cập nhật");
                    a.setWard("Chưa cập nhật");
                    a.setDistrict("Chưa cập nhật");
                    a.setCity("Chưa cập nhật");
                    a.setCustomer(customer);
                    return addressRepository.save(a);
                });
    }

    // ===================================================================
    // 🔍 HÀM HỖ TRỢ TRA CỨU
    // ===================================================================
    public Long getUserIdByUsername(String username) {
        return customerRepository.findAll().stream()
                .filter(c -> c.getAccount() != null &&
                        (username.equals(c.getAccount().getUsername()) ||
                                username.equals(c.getAccount().getEmail())))
                .findFirst()
                .map(Customer::getId)
                .orElse(null);
    }

    public Long getUserIdByEmail(String email) {
        return customerRepository.findAll().stream()
                .filter(c -> c.getAccount() != null &&
                        email.equals(c.getAccount().getEmail()))
                .findFirst()
                .map(Customer::getId)
                .orElse(null);
    }

    public String getEmailByUserId(Long userId) {
        Customer customer = customerRepository.findById(userId).orElse(null);
        return (customer != null && customer.getAccount() != null)
                ? customer.getAccount().getEmail()
                : null;
    }

    public String getUsernameByUserId(Long userId) {
        Customer customer = customerRepository.findById(userId).orElse(null);
        return (customer != null && customer.getAccount() != null)
                ? customer.getAccount().getUsername()
                : null;
    }

    @Transactional
    public void linkGoogleIdIfMissing(Long userId, String googleSub) {
        if (googleSub == null || googleSub.isEmpty()) return;
        Customer customer = customerRepository.findById(userId).orElse(null);
        if (customer == null || customer.getGoogleId() != null) return;
        customer.setGoogleId(googleSub);
        customerRepository.save(customer);
    }
}
