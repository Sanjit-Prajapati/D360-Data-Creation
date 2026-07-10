package com.transactionconfig.narration.service.impl;

import com.transactionconfig.narration.dto.request.CreateNarrationRequest;
import com.transactionconfig.narration.dto.request.NarrationSearchRequest;
import com.transactionconfig.narration.dto.request.UpdateNarrationRequest;
import com.transactionconfig.narration.dto.response.NarrationResponse;
import com.transactionconfig.narration.entity.NarrationMaster;
import com.transactionconfig.narration.enums.FipId;
import com.transactionconfig.narration.enums.TransactionCategory;
import com.transactionconfig.narration.enums.TransactionType;
import com.transactionconfig.narration.mapper.NarrationMasterMapper;
import com.transactionconfig.narration.repository.NarrationMasterRepository;
import com.transactionconfig.narration.service.NarrationMasterService;
import com.transactionconfig.narration.validator.NarrationMasterValidator;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class NarrationMasterServiceImpl implements NarrationMasterService {

    private final NarrationMasterRepository repository;
    private final NarrationMasterValidator validator;
    private final MongoTemplate mongoTemplate;

    @Autowired
    public NarrationMasterServiceImpl(
            NarrationMasterRepository repository,
            NarrationMasterValidator validator,
            MongoTemplate mongoTemplate) {
        this.repository = repository;
        this.validator = validator;
        this.mongoTemplate = mongoTemplate;
    }

    // ─── List / Search ────────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public Page<NarrationResponse> getAll(
            String search,
            FipId fipId,
            TransactionType transactionType,
            TransactionCategory transactionCategory,
            Pageable pageable) {

        Query query = buildFilterQuery(search, fipId, transactionType, transactionCategory);

        long total = mongoTemplate.count(query, NarrationMaster.class);
        query.with(pageable);
        List<NarrationMaster> list = mongoTemplate.find(query, NarrationMaster.class);

        List<NarrationResponse> content = list.stream()
                .map(NarrationMasterMapper::toResponse)
                .collect(Collectors.toList());

        return new PageImpl<>(content, pageable, total);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<NarrationResponse> searchWithMultipleFips(
            NarrationSearchRequest searchRequest,
            Pageable pageable) {

        Query query = buildSearchQuery(searchRequest);

        long total = mongoTemplate.count(query, NarrationMaster.class);
        query.with(pageable);
        List<NarrationMaster> list = mongoTemplate.find(query, NarrationMaster.class);

        List<NarrationResponse> content = list.stream()
                .map(NarrationMasterMapper::toResponse)
                .collect(Collectors.toList());

        return new PageImpl<>(content, pageable, total);
    }

    @Override
    @Transactional(readOnly = true)
    public byte[] exportToCsv(NarrationSearchRequest searchRequest) {
        Query query = new Query();
        
        // Apply filters if search request is provided
        if (searchRequest != null) {
            query = buildSearchQuery(searchRequest);
        }
        
        // Get all matching records without pagination
        List<NarrationMaster> allRecords = mongoTemplate.find(query, NarrationMaster.class);
        
        return generateCsvBytes(allRecords);
    }

    // ─── Options (Transaction Creation screen) ────────────────────────────────

    /**
     * Returns all narration rules for the given (fipId, transactionType).
     */
    @Override
    @Transactional(readOnly = true)
    public List<NarrationResponse> getNarrationOptions(FipId fipId, TransactionType transactionType) {
        Query query = new Query();
        query.addCriteria(Criteria.where("fipId").is(fipId));
        query.addCriteria(Criteria.where("transactionType").is(transactionType));

        return mongoTemplate.find(query, NarrationMaster.class)
                .stream()
                .map(NarrationMasterMapper::toResponse)
                .collect(Collectors.toList());
    }

    // ─── CRUD ─────────────────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public NarrationResponse getById(String id) {
        NarrationMaster narration = repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Narration rule not found for id: " + id));
        return NarrationMasterMapper.toResponse(narration);
    }

    @Override
    @Transactional
    public List<NarrationResponse> create(CreateNarrationRequest request) {
        validator.validateRegexSyntax(request.getNarrationRegex());

        // 1. Validate uniqueness for every FIP ID upfront — collect all conflicts
        List<String> conflicts = new ArrayList<>();
        for (FipId fipId : request.getFipIds()) {
            if (repository.existsByFipIdAndTransactionTypeAndNarrationRegex(
                    fipId, request.getTransactionType(), request.getNarrationRegex().trim())) {
                conflicts.add(fipId.name());
            }
        }
        if (!conflicts.isEmpty()) {
            throw new IllegalArgumentException(
                    "A narration rule with the given type and regex already exists for FIP ID(s): "
                    + String.join(", ", conflicts));
        }

        // 2. Save one record per FIP ID
        List<NarrationResponse> results = new ArrayList<>();
        for (FipId fipId : request.getFipIds()) {
            NarrationMaster entity = NarrationMasterMapper.toEntity(request, fipId);
            NarrationMaster saved = repository.save(entity);
            results.add(NarrationMasterMapper.toResponse(saved));
        }
        return results;
    }

    @Override
    @Transactional
    public NarrationResponse update(String id, UpdateNarrationRequest request) {
        NarrationMaster existing = repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Narration rule not found for id: " + id));

        validator.validateRegexSyntax(request.getNarrationRegex());
        validator.validateUniquenessForUpdate(
                request.getFipId(),
                request.getTransactionType(),
                request.getNarrationRegex(),
                id);

        NarrationMasterMapper.updateEntity(request, existing);
        NarrationMaster updated = repository.save(existing);
        return NarrationMasterMapper.toResponse(updated);
    }

    @Override
    @Transactional
    public void delete(String id) {
        if (!repository.existsById(id)) {
            throw new IllegalArgumentException("Narration rule not found for id: " + id);
        }
        repository.deleteById(id);
    }

    // ─── Private Helpers ──────────────────────────────────────────────────────

    private Query buildFilterQuery(
            String search,
            FipId fipId,
            TransactionType transactionType,
            TransactionCategory transactionCategory) {

        Query query = new Query();
        List<Criteria> criteria = new ArrayList<>();

        if (fipId != null) {
            criteria.add(Criteria.where("fipId").is(fipId));
        }
        if (transactionType != null) {
            criteria.add(Criteria.where("transactionType").is(transactionType));
        }
        if (transactionCategory != null) {
            criteria.add(Criteria.where("transactionCategory").is(transactionCategory));
        }
        if (search != null && !search.trim().isEmpty()) {
            // Escape regex special characters to prevent ReDoS attacks
            String escapedSearch = Pattern.quote(search.trim());
            String regex = "(?i)" + escapedSearch;
            criteria.add(Criteria.where("narrationRegex").regex(regex));
        }

        if (!criteria.isEmpty()) {
            query.addCriteria(new Criteria().andOperator(criteria.toArray(new Criteria[0])));
        }

        return query;
    }

    private Query buildSearchQuery(NarrationSearchRequest searchRequest) {
        Query query = new Query();
        List<Criteria> criteria = new ArrayList<>();

        // Multiple FIP IDs support using $in operator
        if (searchRequest.getFipIds() != null && !searchRequest.getFipIds().isEmpty()) {
            criteria.add(Criteria.where("fipId").in(searchRequest.getFipIds()));
        }

        if (searchRequest.getTransactionType() != null) {
            criteria.add(Criteria.where("transactionType").is(searchRequest.getTransactionType()));
        }

        if (searchRequest.getTransactionCategory() != null) {
            criteria.add(Criteria.where("transactionCategory").is(searchRequest.getTransactionCategory()));
        }

        if (searchRequest.getNarrationRegex() != null && !searchRequest.getNarrationRegex().trim().isEmpty()) {
            // Escape regex special characters to prevent ReDoS attacks
            String escapedSearch = Pattern.quote(searchRequest.getNarrationRegex().trim());
            String regex = "(?i)" + escapedSearch;
            criteria.add(Criteria.where("narrationRegex").regex(regex));
        }

        if (searchRequest.getDirection() != null) {
            criteria.add(Criteria.where("direction").is(searchRequest.getDirection()));
        }

        if (!criteria.isEmpty()) {
            query.addCriteria(new Criteria().andOperator(criteria.toArray(new Criteria[0])));
        }

        return query;
    }

    private byte[] generateCsvBytes(List<NarrationMaster> records) {
        StringBuilder csv = new StringBuilder();
        
        // CSV Header
        csv.append("ID,FIP ID,Transaction Type,Transaction Category,Narration Regex,Direction,Created At,Updated At\n");
        
        // CSV Data Rows
        for (NarrationMaster record : records) {
            csv.append(escapeCsvValue(record.getId())).append(",");
            csv.append(escapeCsvValue(record.getFipId() != null ? record.getFipId().getValue() : "")).append(",");
            csv.append(escapeCsvValue(record.getTransactionType() != null ? record.getTransactionType().name() : "")).append(",");
            csv.append(escapeCsvValue(record.getTransactionCategory() != null ? record.getTransactionCategory().name() : "")).append(",");
            csv.append(escapeCsvValue(record.getNarrationRegex())).append(",");
            csv.append(escapeCsvValue(record.getDirection() != null ? record.getDirection().name() : "")).append(",");
            csv.append(escapeCsvValue(record.getCreatedAt() != null ? record.getCreatedAt().toString() : "")).append(",");
            csv.append(escapeCsvValue(record.getUpdatedAt() != null ? record.getUpdatedAt().toString() : "")).append("\n");
        }
        
        return csv.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8);
    }

    private String escapeCsvValue(String value) {
        if (value == null) {
            return "";
        }
        
        // Escape quotes and wrap in quotes if contains comma, quote, or newline
        String escaped = value.replace("\"", "\"\"");
        if (escaped.contains(",") || escaped.contains("\"") || escaped.contains("\n") || escaped.contains("\r")) {
            return "\"" + escaped + "\"";
        }
        
        return escaped;
    }
}
