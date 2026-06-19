package com.brunasanguini.mylibrary.service;

import com.brunasanguini.mylibrary.dto.request.InvitedUserRequest;
import com.brunasanguini.mylibrary.dto.response.InvitedUserResponse;
import com.brunasanguini.mylibrary.entity.InvitedUser;
import com.brunasanguini.mylibrary.entity.User;
import com.brunasanguini.mylibrary.exception.ResourceNotFoundException;
import com.brunasanguini.mylibrary.repository.InvitedUserRepository;
import com.brunasanguini.mylibrary.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class InvitedUserService {

    private final InvitedUserRepository invitedUserRepository;
    private final UserRepository userRepository;

    public InvitedUserService(InvitedUserRepository invitedUserRepository,
                              UserRepository userRepository) {
        this.invitedUserRepository = invitedUserRepository;
        this.userRepository = userRepository;
    }

    public List<InvitedUserResponse> findAll() {
        return invitedUserRepository.findAll().stream().map(this::toResponse).toList();
    }

    public InvitedUserResponse findById(UUID id) {
        InvitedUser invited = invitedUserRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Convite não encontrado"));
        return toResponse(invited);
    }

    public InvitedUserResponse create(InvitedUserRequest request) {
        User admin = userRepository.findById(request.adminId())
                .orElseThrow(() -> new ResourceNotFoundException("Administrador não encontrado"));

        InvitedUser invited = new InvitedUser();
        invited.setAdmin(admin);
        invited.setEmail(request.email());
        invited.setAccessLevel(request.accessLevel());
        return toResponse(invitedUserRepository.save(invited));
    }

    public InvitedUserResponse update(UUID id, InvitedUserRequest request) {
        InvitedUser invited = invitedUserRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Convite não encontrado"));
        User admin = userRepository.findById(request.adminId())
                .orElseThrow(() -> new ResourceNotFoundException("Administrador não encontrado"));

        invited.setAdmin(admin);
        invited.setEmail(request.email());
        invited.setAccessLevel(request.accessLevel());
        return toResponse(invitedUserRepository.save(invited));
    }

    public void delete(UUID id) {
        invitedUserRepository.deleteById(id);
    }

    private InvitedUserResponse toResponse(InvitedUser invited) {
        return new InvitedUserResponse(
                invited.getId(),
                invited.getAdmin().getId(),
                invited.getEmail(),
                invited.getAccessLevel()
        );
    }
}