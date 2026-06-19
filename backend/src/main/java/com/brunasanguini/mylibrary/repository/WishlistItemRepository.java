package com.brunasanguini.mylibrary.repository;

import com.brunasanguini.mylibrary.entity.WishlistItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface WishlistItemRepository extends JpaRepository<WishlistItem, UUID> {
}
