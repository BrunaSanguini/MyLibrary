package com.brunasanguini.mylibrary.repository;

import com.brunasanguini.mylibrary.entity.Genre;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface GenreRepository extends JpaRepository<Genre, UUID> {
    List<Genre> findByParentIsNull();   // só gêneros raiz
    List<Genre> findByParentId(UUID parentId);  // subgêneros de um pai
}