package com.brunasanguini.mylibrary.repository;

import com.brunasanguini.mylibrary.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {
}
