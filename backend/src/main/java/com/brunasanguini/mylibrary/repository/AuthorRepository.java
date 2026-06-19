package com.brunasanguini.mylibrary.repository;

import com.brunasanguini.mylibrary.entity.Author;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface AuthorRepository extends JpaRepository<Author, UUID> {

}
