package com.brunasanguini.mylibrary.repository;

import com.brunasanguini.mylibrary.entity.InvitedUser;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface InvitedUserRepository extends JpaRepository<InvitedUser, UUID> {
}
