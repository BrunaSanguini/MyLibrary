package com.brunasanguini.mylibrary.repository;

import com.brunasanguini.mylibrary.entity.Language;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface LanguageRepository extends JpaRepository<Language, UUID> {
}
