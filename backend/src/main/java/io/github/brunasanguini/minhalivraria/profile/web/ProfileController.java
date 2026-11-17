package io.github.brunasanguini.minhalivraria.profile.web;

import io.github.brunasanguini.minhalivraria.profile.application.AvatarResponse;
import io.github.brunasanguini.minhalivraria.profile.application.ProfileRequest;
import io.github.brunasanguini.minhalivraria.profile.application.ProfileResponse;
import io.github.brunasanguini.minhalivraria.profile.application.ProfileService;
import io.github.brunasanguini.minhalivraria.shared.web.UploadedFile;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@Tag(name = "profile", description = "Name, avatar and theme of the owner of the library")
@RestController
@RequestMapping("/profile")
class ProfileController {

    private final ProfileService service;

    ProfileController(ProfileService service) {
        this.service = service;
    }

    @Operation(operationId = "getProfile")
    @GetMapping
    ProfileResponse get() {
        return service.get();
    }

    @Operation(
            operationId = "updateProfile",
            summary = "Changes the name and the theme",
            description = "A blank name removes it: the app then greets without a name.")
    @PutMapping
    ProfileResponse update(@Valid @RequestBody ProfileRequest request) {
        return service.update(request);
    }

    @Operation(
            operationId = "replaceProfileAvatar",
            summary = "Sends the avatar",
            description = "JPEG, PNG or WebP up to 5 MB, the same rules as the covers. The previous avatar goes to"
                    + " the trash.")
    @PutMapping(path = "/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    AvatarResponse replaceAvatar(@RequestPart("file") MultipartFile file) {
        return service.replaceAvatar(UploadedFile.bytesOf(file));
    }

    @Operation(operationId = "removeProfileAvatar")
    @DeleteMapping("/avatar")
    ResponseEntity<Void> removeAvatar() {
        service.removeAvatar();
        return ResponseEntity.noContent().build();
    }
}
