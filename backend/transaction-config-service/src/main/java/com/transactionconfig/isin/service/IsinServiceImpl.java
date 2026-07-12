package com.transactionconfig.isin.service;

import com.transactionconfig.isin.dto.request.CreateIsinRequest;
import com.transactionconfig.isin.dto.request.UpdateIsinRequest;
import com.transactionconfig.isin.dto.response.IsinResponse;
import com.transactionconfig.isin.dto.response.IsinImportResponse;
import com.transactionconfig.isin.enums.SecurityType;
import com.transactionconfig.isin.mapper.IsinMapper;
import com.transactionconfig.isin.model.Isin;
import com.transactionconfig.isin.repository.IsinRepository;
import com.transactionconfig.isin.validator.IsinValidator;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.Writer;
import java.io.IOException;

import java.util.List;
import java.util.stream.Collectors;
import java.util.Map;
import java.util.HashMap;
import java.util.Set;
import java.util.regex.Pattern;
import org.springframework.web.multipart.MultipartFile;
import com.transactionconfig.isin.enums.Status;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class IsinServiceImpl implements IsinService {

    private static final Logger log = LoggerFactory.getLogger(IsinServiceImpl.class);

    private final IsinRepository repository;
    private final IsinValidator validator;
    private final MongoTemplate mongoTemplate;

    @Autowired
    public IsinServiceImpl(IsinRepository repository, IsinValidator validator, MongoTemplate mongoTemplate) {
        this.repository = repository;
        this.validator = validator;
        this.mongoTemplate = mongoTemplate;
    }

    @Override
    @Transactional(readOnly = true)
    public Page<IsinResponse> getAll(String search, SecurityType securityType, Pageable pageable) {
        Query query = new Query();

        if (securityType != null) {
            query.addCriteria(Criteria.where("securityType").is(securityType));
        }

        if (search != null && !search.trim().isEmpty()) {
            // Escape regex special characters to prevent ReDoS attacks
            String escapedSearch = Pattern.quote(search.trim());
            String regex = "(?i)" + escapedSearch;
            query.addCriteria(new Criteria().orOperator(
                Criteria.where("isin").regex(regex),
                Criteria.where("securityName").regex(regex)
            ));
        }

        long total = mongoTemplate.count(query, Isin.class);
        query.with(pageable);
        List<Isin> list = mongoTemplate.find(query, Isin.class);

        List<IsinResponse> content = list.stream()
                .map(IsinMapper::toResponse)
                .collect(Collectors.toList());

        return new PageImpl<>(content, pageable, total);
    }

    @Override
    @Transactional(readOnly = true)
    public IsinResponse getById(String id) {
        Isin isin = repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("ISIN record not found for id: " + id));
        return IsinMapper.toResponse(isin);
    }

    @Override
    @Transactional
    public IsinResponse create(CreateIsinRequest request) {
        validator.validateIsinFormat(request.getIsin());
        validator.validateIsinUniqueness(request.getIsin());

        Isin isin = IsinMapper.toEntity(request);
        Isin savedIsin = repository.save(isin);
        return IsinMapper.toResponse(savedIsin);
    }

    @Override
    @Transactional
    public IsinResponse update(String id, UpdateIsinRequest request) {
        Isin isin = repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("ISIN record not found for id: " + id));

        IsinMapper.updateEntity(request, isin);
        Isin updatedIsin = repository.save(isin);
        return IsinMapper.toResponse(updatedIsin);
    }

    @Override
    @Transactional
    public void delete(String id) {
        if (!repository.existsById(id)) {
            throw new IllegalArgumentException("ISIN record not found for id: " + id);
        }
        repository.deleteById(id);
    }

    @Override
    @Transactional(readOnly = true)
    public void exportToCsv(Writer writer, String search, SecurityType securityType) throws IOException {
        Query query = new Query();

        if (securityType != null) {
            query.addCriteria(Criteria.where("securityType").is(securityType));
        }

        if (search != null && !search.trim().isEmpty()) {
            // Escape regex special characters to prevent ReDoS attacks
            String escapedSearch = Pattern.quote(search.trim());
            String regex = "(?i)" + escapedSearch;
            query.addCriteria(new Criteria().orOperator(
                Criteria.where("isin").regex(regex),
                Criteria.where("securityName").regex(regex)
            ));
        }

        List<Isin> list = mongoTemplate.find(query, Isin.class);

        if (list.isEmpty()) {
            throw new IllegalArgumentException("No records are available for export");
        }

        // Header row matching the expected CSV header format
        writer.write("isin,securityName,symbol,securityType,status,createdAt,updatedAt\n");
        for (Isin isin : list) {
            writer.write(String.format("\"%s\",\"%s\",\"%s\",\"%s\",\"%s\",\"%s\",\"%s\"\n",
                escapeCsv(isin.getIsin()),
                escapeCsv(isin.getSecurityName()),
                escapeCsv(isin.getSymbol()),
                isin.getSecurityType(),
                isin.getStatus(),
                isin.getCreatedAt() != null ? isin.getCreatedAt().toString() : "",
                isin.getUpdatedAt() != null ? isin.getUpdatedAt().toString() : ""
            ));
        }
        writer.flush();
    }

    // Escape double-quotes for CSV, and neutralize CSV injection by
    // prepending a single-quote if the value starts with a formula trigger character.
    private String escapeCsv(String val) {
        if (val == null) {
            return "";
        }
        String escaped = val.replace("\"", "\"\"");
        // Neutralize CSV injection (formula injection): =, +, -, @, \t, \r
        if (!escaped.isEmpty() && "=+-@\t\r".indexOf(escaped.charAt(0)) >= 0) {
            escaped = "'" + escaped;
        }
        return escaped;
    }

    private static final int MAX_IMPORT_ROWS = 200_000;
    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "text/csv", "application/csv", "application/vnd.ms-excel",
            "text/plain", "application/octet-stream"
    );

    @Override
    @Transactional
    public IsinImportResponse importFromCsv(MultipartFile file) throws IOException {
        // ── Security: null / empty guard ──────────────────────────────────────
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("No file provided or file is empty.");
        }

        // ── Security: file extension check ────────────────────────────────────
        String originalName = file.getOriginalFilename();
        if (originalName == null || !originalName.toLowerCase().endsWith(".csv")) {
            throw new SecurityException("Only CSV files (.csv) are allowed for import.");
        }

        // ── Security: MIME type check (defence-in-depth) ──────────────────────
        String contentType = file.getContentType();
        if (contentType != null && !ALLOWED_CONTENT_TYPES.contains(contentType.toLowerCase().split(";")[0].trim())) {
            throw new SecurityException("Invalid file type '" + contentType + "'. Only CSV files are accepted.");
        }

        List<Isin> pendingRecords = new ArrayList<>();
        int totalCount = 0;

        try (BufferedReader reader = new BufferedReader(new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {

            // ── Auto-detect header row: skip title/metadata lines ─────────────
            String[] headers = null;
            String line;
            while ((line = reader.readLine()) != null) {
                if (line.trim().isEmpty()) continue;
                String[] parts = line.split(",");
                boolean hasIsin = false;
                for (String p : parts) {
                    if (p.trim().replaceAll("^\"|\"$", "").toLowerCase().contains("isin")) {
                        hasIsin = true;
                        break;
                    }
                }
                if (hasIsin) {
                    headers = parts;
                    for (int i = 0; i < headers.length; i++) {
                        headers[i] = headers[i].trim().replaceAll("^\"|\"$", "").toLowerCase();
                    }
                    break;
                }
            }

            if (headers == null) {
                throw new IllegalArgumentException("CSV must contain an 'ISIN' column header.");
            }

            int isinIdx = -1;
            int nameIdx = -1;
            int symbolIdx = -1;
            int typeIdx = -1;
            int statusIdx = -1;
            int seriesIdx = -1;

            // First pass: Exact matches
            for (int i = 0; i < headers.length; i++) {
                String header = headers[i];
                if (header.equals("isin") || header.equals("isin no")) isinIdx = i;
                if (header.equals("name") || header.equals("sctyname") || header.equals("fininstrmnm") || header.equals("security name") || header.equals("company name")) nameIdx = i;
                if (header.equals("symbol") || header.equals("scrip code") || header.equals("scrip_code") || header.equals("tckrsymb")) symbolIdx = i;
                if (header.equals("securitytype") || header.equals("security_type")) typeIdx = i;
                if (header.equals("status")) statusIdx = i;
                if (header.equals("series") || header.equals("sctysrs")) seriesIdx = i;
            }
            // Second pass: Partial matches for missing columns
            for (int i = 0; i < headers.length; i++) {
                String header = headers[i];
                if (isinIdx == -1 && header.contains("isin")) isinIdx = i;
                if (nameIdx == -1 && (header.contains("name") || header.contains("instrmnm") || header.contains("desc"))) nameIdx = i;
                if (symbolIdx == -1 && (header.contains("scrip") || header.contains("tckr"))) symbolIdx = i;
                if (seriesIdx == -1 && header.contains("series")) seriesIdx = i;
            }

            if (isinIdx == -1) {
                throw new IllegalArgumentException("CSV must contain an 'ISIN' column.");
            }


            while ((line = reader.readLine()) != null) {
                if (line.trim().isEmpty()) continue;

                // ── Security: max row DoS limit ───────────────────────────────
                if (totalCount >= MAX_IMPORT_ROWS) {
                    throw new IllegalArgumentException(
                        "Import exceeds the maximum allowed row limit of " + MAX_IMPORT_ROWS + " records."
                    );
                }

                List<String> values = parseCsvLine(line);

                // ── Security: sanitize cell values (strip CSV injection chars)
                String isinVal   = sanitizeField(getValue(values, isinIdx)).toUpperCase().trim();
                String nameVal   = nameIdx != -1 ? sanitizeField(getValue(values, nameIdx)).trim() : "";
                String symbolVal = symbolIdx != -1 ? sanitizeField(getValue(values, symbolIdx)).trim() : "";
                
                if (nameVal.isEmpty()) {
                    nameVal = symbolVal.isEmpty() ? isinVal : symbolVal;
                }
                String typeVal   = sanitizeField(getValue(values, typeIdx)).toUpperCase().trim();
                String statusVal = sanitizeField(getValue(values, statusIdx)).toUpperCase().trim();
                String seriesVal = seriesIdx != -1 ? sanitizeField(getValue(values, seriesIdx)).toUpperCase().trim() : "";

                // Validate ISIN format (must be exactly 12 alphanumeric characters)
                if (isinVal.isEmpty() || isinVal.length() != 12 || !isinVal.matches("^[A-Z0-9]{12}$")) {
                    continue;
                }

                // Take only specific series based on user requirements
                if (seriesIdx != -1) {
                    if (!java.util.List.of("EQ", "BE", "BZ", "SM", "ST", "SZ", "RR", "RT", "IV", "ID").contains(seriesVal)) {
                        continue;
                    }
                }

                totalCount++;

                SecurityType type = SecurityType.EQUITY;
                if (typeIdx != -1 && !typeVal.isEmpty()) {
                    try {
                        type = SecurityType.valueOf(typeVal);
                    } catch (IllegalArgumentException e) {
                        log.warn("Invalid SecurityType '{}' for ISIN '{}', defaulting to EQUITY", typeVal, isinVal);
                    }
                } else if (seriesIdx != -1 && !seriesVal.isEmpty()) {
                    type = mapSeriesToSecurityType(seriesVal);
                }

                Status status = Status.ACTIVE;
                try {
                    if (!statusVal.isEmpty()) status = Status.valueOf(statusVal);
                } catch (IllegalArgumentException e) {
                    log.warn("Invalid Status '{}' for ISIN '{}', defaulting to ACTIVE", statusVal, isinVal);
                }

                Isin entity = Isin.builder()
                        .isin(isinVal)
                        .securityName(nameVal)
                        .symbol(symbolVal)
                        .securityType(type)
                        .status(status)
                        .build();
                        
                pendingRecords.add(entity);
            }
        }

        if (pendingRecords.isEmpty()) {
            throw new IllegalArgumentException("No valid records found to import.");
        }

        // Bulk Fetch Existing ISINs to solve N+1 query issue
        Set<String> isinSet = pendingRecords.stream().map(Isin::getIsin).collect(Collectors.toSet());
        List<Isin> existingList = repository.findByIsinIn(isinSet);
        Map<String, Isin> existingMap = existingList.stream().collect(Collectors.toMap(Isin::getIsin, i -> i));

        int createdCount = 0;
        int duplicateCount = 0;
        
        List<Isin> toSave = new ArrayList<>();
        
        for (Isin parsed : pendingRecords) {
            Isin existing = existingMap.get(parsed.getIsin());
            if (existing != null) {
                duplicateCount++;
                existing.setSecurityName(parsed.getSecurityName());
                existing.setSymbol(parsed.getSymbol());
                existing.setSecurityType(parsed.getSecurityType());
                existing.setStatus(parsed.getStatus());
                toSave.add(existing);
            } else {
                createdCount++;
                toSave.add(parsed);
                // Pre-empt internal duplicates in the CSV
                existingMap.put(parsed.getIsin(), parsed);
            }
        }

        // Batch Save
        List<Isin> saved = new ArrayList<>();
        int batchSize = 1000;
        for (int i = 0; i < toSave.size(); i += batchSize) {
            int end = Math.min(toSave.size(), i + batchSize);
            saved.addAll(repository.saveAll(toSave.subList(i, end)));
        }

        List<IsinResponse> savedResponses = saved.stream()
                .map(IsinMapper::toResponse)
                .collect(Collectors.toList());

        return IsinImportResponse.builder()
                .totalRecords(totalCount)
                .recordsCreated(createdCount)
                .duplicateRecords(duplicateCount)
                .records(savedResponses)
                .build();
    }

    /** Strip leading CSV injection trigger characters from user-supplied cell values. */
    private String sanitizeField(String val) {
        if (val == null) return "";
        String v = val.trim();
        while (!v.isEmpty() && "=+-@\t\r|".indexOf(v.charAt(0)) >= 0) {
            v = v.substring(1).trim();
        }
        return v;
    }

    private List<String> parseCsvLine(String line) {
        List<String> values = new ArrayList<>();
        StringBuilder sb = new StringBuilder();
        boolean inQuotes = false;
        for (int i = 0; i < line.length(); i++) {
            char c = line.charAt(i);
            if (c == '"') {
                inQuotes = !inQuotes;
            } else if (c == ',' && !inQuotes) {
                values.add(sb.toString().trim().replaceAll("^\"|\"$", "").replaceAll("\"\"", "\""));
                sb.setLength(0);
            } else {
                sb.append(c);
            }
        }
        values.add(sb.toString().trim().replaceAll("^\"|\"$", "").replaceAll("\"\"", "\""));
        return values;
    }

    private String getValue(List<String> values, int index) {
        if (index >= 0 && index < values.size()) {
            return values.get(index);
        }
        return "";
    }

    private SecurityType mapSeriesToSecurityType(String series) {
        if (series == null) {
            return SecurityType.EQUITY;
        }
        switch (series.toUpperCase().trim()) {
            case "EQ":
            case "BE":
            case "BZ":
            case "SM":
            case "ST":
            case "SZ":
                return SecurityType.EQUITY;
            case "RR":
            case "RT":
                return SecurityType.REIT;
            case "IV":
            case "ID":
                return SecurityType.INVIT;
            default:
                return SecurityType.EQUITY;
        }
    }
}
