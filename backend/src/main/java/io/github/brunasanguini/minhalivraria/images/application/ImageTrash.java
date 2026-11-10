package io.github.brunasanguini.minhalivraria.images.application;

import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionalEventListener;

/** Moves discarded images to the trash only after the commit: a rollback keeps the file where it was. */
@Component
class ImageTrash {

    private final ImageFiles files;

    ImageTrash(ImageFiles files) {
        this.files = files;
    }

    @TransactionalEventListener
    void on(ImageDiscarded event) {
        files.moveToTrash(event.kind(), event.fileName());
    }
}
