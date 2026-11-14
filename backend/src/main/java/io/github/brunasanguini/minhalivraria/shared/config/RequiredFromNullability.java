package io.github.brunasanguini.minhalivraria.shared.config;

import io.swagger.v3.core.converter.AnnotatedType;
import io.swagger.v3.core.converter.ModelConverter;
import io.swagger.v3.core.converter.ModelConverterContext;
import io.swagger.v3.oas.models.media.Schema;
import java.lang.reflect.Method;
import java.lang.reflect.ParameterizedType;
import java.lang.reflect.RecordComponent;
import java.lang.reflect.Type;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import org.jspecify.annotations.Nullable;
import org.springframework.stereotype.Component;

/**
 * Marks every component of our response records as {@code required}, unless it is {@code @Nullable}.
 *
 * <p>Without this the whole contract is optional: springdoc derives {@code required} from Bean Validation, which only
 * exists on requests, so the generated front-end types would read every field of every response as possibly
 * undefined even though the code is {@code @NullMarked}. Annotating each DTO with {@code @Schema(requiredMode =
 * REQUIRED)} would say the same thing by hand, one field at a time, and quietly drift the first time someone forgets.
 *
 * <p>If a springdoc upgrade ever breaks this, {@code OpenApiContractTest} fails against docs/openapi.json instead of
 * the contract silently loosening.
 */
@Component
class RequiredFromNullability implements ModelConverter {

    private static final String OUR_PACKAGE = "io.github.brunasanguini.minhalivraria.";

    @Override
    public @Nullable Schema<?> resolve(
            AnnotatedType type, ModelConverterContext context, Iterator<ModelConverter> chain) {
        Schema<?> resolved = chain.hasNext() ? chain.next().resolve(type, context, chain) : null;
        if (resolved == null) {
            return null;
        }
        Class<?> record = ourRecord(type.getType());
        if (record != null) {
            markRequired(record, model(resolved, context));
        }
        return resolved;
    }

    /** A resolved schema is usually a {@code $ref}; the object itself is held by the context. */
    private static @Nullable Schema<?> model(Schema<?> resolved, ModelConverterContext context) {
        String reference = resolved.get$ref();
        if (reference == null) {
            return resolved;
        }
        Map<String, Schema> defined = context.getDefinedModels();
        return defined.get(reference.substring(reference.lastIndexOf('/') + 1));
    }

    private static void markRequired(Class<?> record, @Nullable Schema<?> model) {
        if (model == null || model.getProperties() == null) {
            return;
        }
        for (RecordComponent component : record.getRecordComponents()) {
            List<String> required = model.getRequired();
            boolean alreadyThere = required != null && required.contains(component.getName());
            if (!alreadyThere && !isNullable(component) && model.getProperties().containsKey(component.getName())) {
                model.addRequiredItem(component.getName());
            }
        }
    }

    /** JSpecify's {@code @Nullable} is a type-use annotation, so it sits on the component's annotated type. */
    private static boolean isNullable(RecordComponent component) {
        return component.getAnnotatedType().isAnnotationPresent(Nullable.class)
                || component.isAnnotationPresent(Nullable.class);
    }

    /** Only our own records: library types keep whatever springdoc decided for them. */
    private static @Nullable Class<?> ourRecord(@Nullable Type type) {
        Class<?> raw = rawClass(type);
        return raw != null && raw.isRecord() && raw.getName().startsWith(OUR_PACKAGE) ? raw : null;
    }

    private static @Nullable Class<?> rawClass(@Nullable Type type) {
        if (type instanceof Class<?> clazz) {
            return clazz;
        }
        if (type instanceof ParameterizedType parameterized) {
            return rawClass(parameterized.getRawType());
        }
        return jacksonRawClass(type);
    }

    /**
     * Swagger hands us Jackson's {@code JavaType}, which lives on its own classpath and not ours, so the raw class is
     * read reflectively instead of by importing a second Jackson.
     */
    private static @Nullable Class<?> jacksonRawClass(@Nullable Type type) {
        if (type == null) {
            return null;
        }
        try {
            Method getRawClass = type.getClass().getMethod("getRawClass");
            return getRawClass.invoke(type) instanceof Class<?> raw ? raw : null;
        } catch (ReflectiveOperationException notAJavaType) {
            return null;
        }
    }
}
