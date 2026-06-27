package com.brunasanguini.mylibrary.service;

import com.brunasanguini.mylibrary.dto.request.LoginRequest;
import com.brunasanguini.mylibrary.dto.request.RegisterRequest;
import com.brunasanguini.mylibrary.dto.response.AuthResponse;
import com.brunasanguini.mylibrary.entity.User;
import com.brunasanguini.mylibrary.entity.UserRole;
import com.brunasanguini.mylibrary.repository.UserRepository;
import com.brunasanguini.mylibrary.security.JwtService;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;

    public AuthService(UserRepository userRepository,
                       JwtService jwtService,
                       PasswordEncoder passwordEncoder,
                       AuthenticationManager authenticationManager) {
        this.userRepository = userRepository;
        this.jwtService = jwtService;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
    }

    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new IllegalArgumentException("E-mail já cadastrado");
        }

        User user = new User();
        user.setName(request.name());
        user.setEmail(request.email());
        user.setPassword(passwordEncoder.encode(request.password()));

        // Primeiro usuário registrado vira ADMIN automaticamente
        user.setRole(userRepository.count() == 0 ? UserRole.ADMIN : UserRole.GUEST);

        userRepository.save(user);
        String token = jwtService.generateToken(user);

        return new AuthResponse(token, user.getName(), user.getEmail(), user.getRole().name());
    }

    public AuthResponse login(LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.email(), request.password()));

        User user = userRepository.findByEmail(request.email())
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));

        String token = jwtService.generateToken(user);
        return new AuthResponse(token, user.getName(), user.getEmail(), user.getRole().name());
    }
}