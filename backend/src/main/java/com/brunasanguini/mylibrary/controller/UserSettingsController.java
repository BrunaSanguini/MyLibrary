package com.brunasanguini.mylibrary.controller;

import com.brunasanguini.mylibrary.dto.response.UserSettingsResponse;
import com.brunasanguini.mylibrary.entity.User;
import com.brunasanguini.mylibrary.entity.UserSettings;
import com.brunasanguini.mylibrary.repository.UserSettingsRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/settings")
public class UserSettingsController {

    private final UserSettingsRepository userSettingsRepository;

    public UserSettingsController(UserSettingsRepository userSettingsRepository) {
        this.userSettingsRepository = userSettingsRepository;
    }

    @GetMapping
    public ResponseEntity<UserSettingsResponse> getSettings(@AuthenticationPrincipal User user) {
        UserSettings settings = userSettingsRepository.findByUserId(user.getId())
                .orElseGet(() -> {
                    UserSettings s = new UserSettings();
                    s.setUser(user);
                    return userSettingsRepository.save(s);
                });
        return ResponseEntity.ok(new UserSettingsResponse(settings.getId(), settings.getAnnualGoal()));
    }

    @PutMapping("/goal")
    public ResponseEntity<UserSettingsResponse> updateGoal(@AuthenticationPrincipal User user,
                                                           @RequestParam Integer goal) {
        UserSettings settings = userSettingsRepository.findByUserId(user.getId())
                .orElseGet(() -> {
                    UserSettings s = new UserSettings();
                    s.setUser(user);
                    return s;
                });
        settings.setAnnualGoal(goal);
        UserSettings saved = userSettingsRepository.save(settings);
        return ResponseEntity.ok(new UserSettingsResponse(saved.getId(), saved.getAnnualGoal()));
    }
}