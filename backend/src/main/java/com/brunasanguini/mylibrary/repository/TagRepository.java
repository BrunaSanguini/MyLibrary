package com.brunasanguini.mylibrary.repository;

import com.brunasanguini.mylibrary.entity.Tag;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface TagRepository extends JpaRepository<Tag, UUID> {
}
