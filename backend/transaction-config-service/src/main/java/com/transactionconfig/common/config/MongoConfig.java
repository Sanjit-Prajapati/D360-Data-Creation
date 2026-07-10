package com.transactionconfig.common.config;

import com.transactionconfig.narration.enums.Direction;
import com.transactionconfig.narration.enums.FipId;
import com.transactionconfig.narration.enums.TransactionCategory;
import com.transactionconfig.narration.enums.TransactionType;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.convert.converter.Converter;
import org.springframework.data.convert.ReadingConverter;
import org.springframework.data.convert.WritingConverter;
import org.springframework.data.mongodb.config.AbstractMongoClientConfiguration;
import org.springframework.data.mongodb.core.convert.MongoCustomConversions;

import java.util.Arrays;
import java.util.List;

@Configuration
public class MongoConfig extends AbstractMongoClientConfiguration {

    @Override
    protected String getDatabaseName() {
        return "Transaction";
    }

    @Override
    public MongoCustomConversions customConversions() {
        List<Converter<?, ?>> converters = Arrays.asList(
                new FipIdWriteConverter(),
                new FipIdReadConverter(),
                new DirectionWriteConverter(),
                new DirectionReadConverter(),
                new TransactionTypeWriteConverter(),
                new TransactionTypeReadConverter(),
                new TransactionCategoryWriteConverter(),
                new TransactionCategoryReadConverter()
        );
        return new MongoCustomConversions(converters);
    }

    // FipId Converters
    @WritingConverter
    public static class FipIdWriteConverter implements Converter<FipId, String> {
        @Override
        public String convert(FipId source) {
            return source.getValue(); // Store the actual value: fip@finrepo, fip@nsdl, CDSLFIP
        }
    }

    @ReadingConverter
    public static class FipIdReadConverter implements Converter<String, FipId> {
        @Override
        public FipId convert(String source) {
            // Handle both enum names and values for backward compatibility
            for (FipId fipId : FipId.values()) {
                if (fipId.getValue().equals(source) || fipId.name().equals(source)) {
                    return fipId;
                }
            }
            throw new IllegalArgumentException("Invalid FipId value: " + source);
        }
    }

    // Direction Converters (store as enum name: CREDIT, DEBIT)
    @WritingConverter
    public static class DirectionWriteConverter implements Converter<Direction, String> {
        @Override
        public String convert(Direction source) {
            return source.name();
        }
    }

    @ReadingConverter
    public static class DirectionReadConverter implements Converter<String, Direction> {
        @Override
        public Direction convert(String source) {
            try {
                return Direction.valueOf(source);
            } catch (IllegalArgumentException e) {
                throw new IllegalArgumentException("Invalid Direction value: " + source);
            }
        }
    }

    // TransactionType Converters (store as enum name)
    @WritingConverter
    public static class TransactionTypeWriteConverter implements Converter<TransactionType, String> {
        @Override
        public String convert(TransactionType source) {
            return source.name();
        }
    }

    @ReadingConverter
    public static class TransactionTypeReadConverter implements Converter<String, TransactionType> {
        @Override
        public TransactionType convert(String source) {
            try {
                return TransactionType.valueOf(source);
            } catch (IllegalArgumentException e) {
                throw new IllegalArgumentException("Invalid TransactionType value: " + source);
            }
        }
    }

    // TransactionCategory Converters (store as enum name)
    @WritingConverter
    public static class TransactionCategoryWriteConverter implements Converter<TransactionCategory, String> {
        @Override
        public String convert(TransactionCategory source) {
            return source.name();
        }
    }

    @ReadingConverter
    public static class TransactionCategoryReadConverter implements Converter<String, TransactionCategory> {
        @Override
        public TransactionCategory convert(String source) {
            try {
                return TransactionCategory.valueOf(source);
            } catch (IllegalArgumentException e) {
                throw new IllegalArgumentException("Invalid TransactionCategory value: " + source);
            }
        }
    }
}