package io.github.brunasanguini.minhalivraria.profile.application;

import io.github.brunasanguini.minhalivraria.images.ImageKind;
import io.github.brunasanguini.minhalivraria.images.ImageStore;
import io.github.brunasanguini.minhalivraria.images.ImageUrls;
import io.github.brunasanguini.minhalivraria.profile.domain.Profile;
import io.github.brunasanguini.minhalivraria.profile.domain.ProfileRepository;
import org.jspecify.annotations.Nullable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** The profile of the library: name, avatar and theme. The avatar follows the same rules as the covers. */
@Service
@Transactional(readOnly = true)
public class ProfileService {

    private final ProfileRepository profiles;
    private final ImageStore images;

    ProfileService(ProfileRepository profiles, ImageStore images) {
        this.profiles = profiles;
        this.images = images;
    }

    public ProfileResponse get() {
        return toResponse(profile());
    }

    @Transactional
    public ProfileResponse update(ProfileRequest request) {
        Profile profile = profile();
        profile.update(request.displayName(), request.theme());
        return toResponse(profile);
    }

    /**
     * The previous avatar goes to the trash only after the transaction commits.
     *
     * @throws io.github.brunasanguini.minhalivraria.shared.error.UnsupportedMediaTypeException {@code
     *     image.invalid-type}
     * @throws io.github.brunasanguini.minhalivraria.shared.error.PayloadTooLargeException {@code image.too-large}
     */
    @Transactional
    public AvatarResponse replaceAvatar(byte[] content) {
        long imageId = images.store(ImageKind.AVATAR, content);
        discard(profile().replaceAvatar(imageId));
        return new AvatarResponse(ImageUrls.of(imageId));
    }

    @Transactional
    public void removeAvatar() {
        discard(profile().replaceAvatar(null));
    }

    /** The first migration creates the row and nothing deletes it, so it is always there. */
    private Profile profile() {
        return profiles.findById(Profile.ID).orElseThrow(() -> new IllegalStateException("The profile row is missing"));
    }

    private void discard(@Nullable Long imageId) {
        if (imageId != null) {
            images.discard(imageId);
        }
    }

    private static ProfileResponse toResponse(Profile profile) {
        Long avatar = profile.avatarImageId();
        return new ProfileResponse(profile.displayName(), avatar == null ? null : ImageUrls.of(avatar), profile.theme());
    }
}
