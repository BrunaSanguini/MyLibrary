package com.brunasanguini.mylibrary.repository;

import com.brunasanguini.mylibrary.entity.Subgenre;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface SubgenreRepository extends JpaRepository<Subgenre, UUID> {
}
