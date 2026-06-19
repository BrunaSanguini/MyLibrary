package com.brunasanguini.mylibrary.repository;

import com.brunasanguini.mylibrary.entity.Review;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface ReviewRepository extends JpaRepository<Review, UUID> {
}
