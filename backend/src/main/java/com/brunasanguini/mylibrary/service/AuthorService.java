package com.brunasanguini.mylibrary.service;

import com.brunasanguini.mylibrary.dto.request.AuthorRequest;
import com.brunasanguini.mylibrary.dto.response.AuthorResponse;
import com.brunasanguini.mylibrary.entity.Author;
import com.brunasanguini.mylibrary.exception.ResourceNotFoundException;
import com.brunasanguini.mylibrary.repository.AuthorRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class AuthorService {

    private final AuthorRepository authorRepository;

    public AuthorService(AuthorRepository authorRepository) {
        this.authorRepository = authorRepository;
    }

    // Listar todos
    public List<AuthorResponse> findAll() {
        return authorRepository.findAll()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    // Buscar por id
    public AuthorResponse findById(UUID id) {
        Author author = authorRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Autor não encontrado"));
        return toResponse(author);
    }

    // Criar
    public AuthorResponse create(AuthorRequest request) {
        Author author = new Author();
        author.setName(request.name());
        author.setBio(request.bio());
        author.setBirthDate(request.birthDate());
        Author saved = authorRepository.save(author);
        return toResponse(saved);
    }

    // Atualizar
    public AuthorResponse update(UUID id, AuthorRequest request) {
        Author author = authorRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Autor não encontrado"));
        author.setName(request.name());
        author.setBio(request.bio());
        author.setBirthDate(request.birthDate());
        Author saved = authorRepository.save(author);
        return toResponse(saved);
    }

    // Deletar
    public void delete(UUID id) {
        authorRepository.deleteById(id);
    }

    // Conversor: Entity → DTO
    private AuthorResponse toResponse(Author author) {
        return new AuthorResponse(
                author.getId(),
                author.getName(),
                author.getBio(),
                author.getBirthDate()
        );
    }
}