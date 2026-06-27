package com.brunasanguini.mylibrary.service;

import com.brunasanguini.mylibrary.dto.request.PublisherRequest;
import com.brunasanguini.mylibrary.dto.response.PublisherResponse;
import com.brunasanguini.mylibrary.entity.Publisher;
import com.brunasanguini.mylibrary.repository.BookRepository;
import com.brunasanguini.mylibrary.repository.PublisherRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class PublisherService {

    private final PublisherRepository publisherRepository;
    private final BookRepository bookRepository;

    public PublisherService(PublisherRepository publisherRepository, BookRepository bookRepository) {
        this.publisherRepository = publisherRepository;
        this.bookRepository = bookRepository;
    }

    public List<PublisherResponse> findAll() {
        return publisherRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    public PublisherResponse findById(UUID id) {
        return toResponse(findOrThrow(id));
    }

    public PublisherResponse create(PublisherRequest request) {
        Publisher publisher = new Publisher();
        publisher.setName(request.name());
        publisher.setCountry(request.country());
        return toResponse(publisherRepository.save(publisher));
    }

    public PublisherResponse update(UUID id, PublisherRequest request) {
        Publisher publisher = findOrThrow(id);
        publisher.setName(request.name());
        publisher.setCountry(request.country());
        return toResponse(publisherRepository.save(publisher));
    }

    public void delete(UUID id) {
        if (bookRepository.existsByPublisherId(id)) {
            throw new IllegalStateException("Não é possível excluir uma editora com livros associados");
        }
        publisherRepository.deleteById(id);
    }

    private Publisher findOrThrow(UUID id) {
        return publisherRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Editora não encontrada"));
    }

    private PublisherResponse toResponse(Publisher publisher) {
        return new PublisherResponse(
                publisher.getId(),
                publisher.getName(),
                publisher.getCountry()
        );
    }
}