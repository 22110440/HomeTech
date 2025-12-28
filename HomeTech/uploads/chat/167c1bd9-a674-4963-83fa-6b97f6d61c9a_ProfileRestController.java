package com.hometech.hometech.controller.Api;

import com.hometech.hometech.dto.UpdateProfileDTO;
import com.hometech.hometech.model.User;
import com.hometech.hometech.service.ProfileService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

@RestController
@RequestMapping("/api/profile")
public class ProfileRestController {

    private final ProfileService profileService;

    public ProfileRestController(ProfileService profileService) {
        this.profileService = profileService;
    }

    @GetMapping("/{userId}")
    public ResponseEntity<UpdateProfileDTO> getProfile(@PathVariable Long userId) {
        try {
            UpdateProfileDTO profile = profileService.getProfile(userId);
            return ResponseEntity.ok(profile);
        } catch (RuntimeException e) {
            // Nếu không tìm thấy Customer, trả về UpdateProfileDTO rỗng thay vì throw exception
            UpdateProfileDTO emptyProfile = new UpdateProfileDTO();
            return ResponseEntity.ok(emptyProfile);
        }
    }

    @PutMapping(value = "/{userId}", consumes = {"multipart/form-data"})
    public User updateOrCreateProfile(
            @PathVariable Long userId,
            @RequestPart("dto") UpdateProfileDTO dto,
            @RequestPart(value = "pictureFile", required = false) MultipartFile pictureFile
    ) throws IOException {
        return profileService.updateOrCreateProfile(userId, dto, pictureFile);
    }
}
