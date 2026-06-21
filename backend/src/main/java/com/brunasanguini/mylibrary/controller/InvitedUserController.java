package com.brunasanguini.mylibrary.controller;

import com.brunasanguini.mylibrary.dto.request.InvitedUserRequest;
import com.brunasanguini.mylibrary.dto.response.InvitedUserResponse;
import com.brunasanguini.mylibrary.service.InvitedUserService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/invited-users")
public class InvitedUserController {



    private final InvitedUserService invitedUserService;

    public InvitedUserController(InvitedUserService invitedUserService) {
        this.invitedUserService = invitedUserService;
    }

    @GetMapping
    public List<InvitedUserResponse> findAll() {
        return invitedUserService.findAll();
    }

    @GetMapping("/{id}")
    public InvitedUserResponse findById(@PathVariable UUID id) {
        return invitedUserService.findById(id);
    }

    @PostMapping
    public ResponseEntity<InvitedUserResponse> create(@Valid @RequestBody InvitedUserRequest request) {
        InvitedUserResponse created = invitedUserService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    public InvitedUserResponse update(@PathVariable UUID id, @Valid @RequestBody InvitedUserRequest request) {
        return invitedUserService.update(id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        invitedUserService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
