package io.github.brunasanguini.minhalivraria.books.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import io.github.brunasanguini.minhalivraria.shared.error.BusinessRuleException;
import io.github.brunasanguini.minhalivraria.shared.error.ConflictException;
import io.github.brunasanguini.minhalivraria.shared.error.NotFoundException;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class GenreServiceTest {

    @Autowired
    private GenreService service;

    @Test
    void shouldListGenresWithTheirSubgenresInNameOrder() {
        long fantasy = service.create(new GenreRequest("Fantasia", null)).id();
        long fiction = service.create(new GenreRequest("Ficção científica", null)).id();
        service.create(new GenreRequest("Fantasia urbana", fantasy));
        service.create(new GenreRequest("Alta fantasia", fantasy));
        service.create(new GenreRequest("Distopia", fiction));

        List<GenreTreeResponse> tree = service.tree();

        assertThat(tree).extracting(GenreTreeResponse::name).containsExactly("Fantasia", "Ficção científica");
        assertThat(tree.getFirst().subgenres())
                .extracting(GenreTreeResponse.Subgenre::name)
                .containsExactly("Alta fantasia", "Fantasia urbana");
        assertThat(tree.getLast().subgenres())
                .extracting(GenreTreeResponse.Subgenre::name)
                .containsExactly("Distopia");
    }

    @Test
    void shouldRefuseAParentThatIsAlreadyASubgenre() {
        long fantasy = service.create(new GenreRequest("Fantasia", null)).id();
        long highFantasy = service.create(new GenreRequest("Alta fantasia", fantasy)).id();

        assertThatThrownBy(() -> service.create(new GenreRequest("Fantasia épica", highFantasy)))
                .isInstanceOf(BusinessRuleException.class)
                .extracting("code")
                .isEqualTo("genre.invalid-parent");
    }

    @Test
    void shouldRefuseTurningAGenreWithSubgenresIntoASubgenre() {
        long fantasy = service.create(new GenreRequest("Fantasia", null)).id();
        long horror = service.create(new GenreRequest("Horror", null)).id();
        service.create(new GenreRequest("Alta fantasia", fantasy));

        assertThatThrownBy(() -> service.update(fantasy, new GenreRequest("Fantasia", horror)))
                .isInstanceOf(BusinessRuleException.class)
                .extracting("code")
                .isEqualTo("genre.invalid-parent");
    }

    @Test
    void shouldMoveASubgenreToAnotherGenre() {
        long fantasy = service.create(new GenreRequest("Fantasia", null)).id();
        long horror = service.create(new GenreRequest("Horror", null)).id();
        long gothic = service.create(new GenreRequest("Gótico", fantasy)).id();

        GenreResponse moved = service.update(gothic, new GenreRequest("Horror gótico", horror));

        assertThat(moved.parentId()).isEqualTo(horror);
        assertThat(moved.name()).isEqualTo("Horror gótico");
    }

    @Test
    void shouldRefuseDeletingAGenreWithSubgenres() {
        long fantasy = service.create(new GenreRequest("Fantasia", null)).id();
        long highFantasy = service.create(new GenreRequest("Alta fantasia", fantasy)).id();

        assertThatThrownBy(() -> service.delete(fantasy))
                .isInstanceOf(ConflictException.class)
                .extracting("code")
                .isEqualTo("genre.has-subgenres");

        service.delete(highFantasy);
        service.delete(fantasy);

        assertThat(service.tree()).isEmpty();
    }

    @Test
    void shouldRefuseANameAlreadyUsedByAGenreOrSubgenre() {
        long fantasy = service.create(new GenreRequest("Fantasia", null)).id();
        service.create(new GenreRequest("Alta fantasia", fantasy));

        assertThatThrownBy(() -> service.create(new GenreRequest("ALTA FANTASIA", null)))
                .isInstanceOf(ConflictException.class)
                .extracting("code")
                .isEqualTo("genre.name-duplicated");
        assertThatThrownBy(() -> service.update(fantasy, new GenreRequest("alta fantasia", null)))
                .isInstanceOf(ConflictException.class);
    }

    @Test
    void shouldReportAnUnknownParent() {
        assertThatThrownBy(() -> service.create(new GenreRequest("Fantasia", 999_999L)))
                .isInstanceOf(NotFoundException.class)
                .extracting("code")
                .isEqualTo("genre.not-found");
    }
}
