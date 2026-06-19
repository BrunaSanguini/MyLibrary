package com.brunasanguini.mylibrary.repository;

import com.brunasanguini.mylibrary.entity.Publisher;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface PublisherRepository extends JpaRepository<Publisher, UUID> {
}
