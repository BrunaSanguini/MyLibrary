package com.brunasanguini.mylibrary.service;

import com.brunasanguini.mylibrary.dto.request.LanguageRequest;
import com.brunasanguini.mylibrary.dto.response.LanguageResponse;
import com.brunasanguini.mylibrary.entity.Language;
import com.brunasanguini.mylibrary.exception.ResourceNotFoundException;
import com.brunasanguini.mylibrary.repository.LanguageRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class LanguageService {

    private final LanguageRepository languageRepository;

    public LanguageService(LanguageRepository languageRepository) {
        this.languageRepository = languageRepository;
    }

    public List<LanguageResponse> findAll() {
        return languageRepository.findAll().stream().map(this::toResponse).toList();
    }

    public LanguageResponse findById(UUID id) {
        Language language = languageRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Idioma não encontrado"));
        return toResponse(language);
    }

    public LanguageResponse create(LanguageRequest request) {
        Language language = new Language();
        language.setName(request.name());
        return toResponse(languageRepository.save(language));
    }

    public LanguageResponse update(UUID id, LanguageRequest request) {
        Language language = languageRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Idioma não encontrado"));
        language.setName(request.name());
        return toResponse(languageRepository.save(language));
    }

    public void delete(UUID id) {
        languageRepository.deleteById(id);
    }

    private LanguageResponse toResponse(Language language) {
        return new LanguageResponse(language.getId(), language.getName());
    }
}