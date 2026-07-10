package com.transactionconfig.common.config;

import com.transactionconfig.isin.enums.SecurityType;
import com.transactionconfig.isin.enums.Status;
import com.transactionconfig.isin.model.Isin;
import com.transactionconfig.isin.repository.IsinRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

@Configuration
public class DbInitializer {

    @Bean
    public CommandLineRunner initDatabase(IsinRepository repository) {
        return args -> {
            if (repository.count() == 0) {
                String[] filesToSeed = {"EQUITY_L.csv", "SME_EQUITY_L.csv"};
                List<Isin> allImported = new ArrayList<>();
                java.util.Set<String> seenIsins = new java.util.HashSet<>();

                for (String fileName : filesToSeed) {
                    File csvFile = new File("data/" + fileName);
                    if (!csvFile.exists()) {
                        csvFile = new File("backend/transaction-config-service/data/" + fileName);
                    }

                    if (csvFile.exists()) {
                        System.out.println("Seeding database from: " + csvFile.getAbsolutePath());
                        List<Isin> fileRecords = new ArrayList<>();
                        
                        try (BufferedReader reader = new BufferedReader(new FileReader(csvFile, StandardCharsets.UTF_8))) {
                            String line = reader.readLine();
                            if (line != null) {
                                String[] headers = line.split(",");
                                for (int i = 0; i < headers.length; i++) {
                                    headers[i] = headers[i].trim().replaceAll("^\"|\"$", "").toLowerCase();
                                }
                                
                                int isinIdx = -1;
                                int nameIdx = -1;
                                int symbolIdx = -1;
                                
                                for (int i = 0; i < headers.length; i++) {
                                    String header = headers[i];
                                    if (header.equals("isin") || header.contains("isin")) isinIdx = i;
                                    else if (header.contains("name")) nameIdx = i;
                                    else if (header.equals("symbol")) symbolIdx = i;
                                }
                                
                                if (isinIdx != -1 && nameIdx != -1) {
                                    while ((line = reader.readLine()) != null) {
                                        if (line.trim().isEmpty()) continue;
                                        
                                        List<String> values = parseCsvLine(line);
                                        String isinVal = getValue(values, isinIdx).toUpperCase().trim();
                                        String nameVal = getValue(values, nameIdx).trim();
                                        String symbolVal = getValue(values, symbolIdx).trim();
                                        
                                        if (!isinVal.isEmpty() && !nameVal.isEmpty()) {
                                            if (seenIsins.contains(isinVal)) {
                                                continue;
                                            }
                                            seenIsins.add(isinVal);
                                            fileRecords.add(Isin.builder()
                                                    .isin(isinVal)
                                                    .securityName(nameVal)
                                                    .symbol(symbolVal)
                                                    .securityType(SecurityType.EQUITY)
                                                    .status(Status.ACTIVE)
                                                    .build());
                                        }
                                    }
                                }
                            }
                        } catch (Exception e) {
                            System.err.println("Error parsing seed CSV file " + fileName + ": " + e.getMessage());
                        }

                        if (!fileRecords.isEmpty()) {
                            System.out.println("Parsed " + fileRecords.size() + " records from " + fileName);
                            allImported.addAll(fileRecords);
                        }
                    } else {
                        System.out.println("Seed file " + fileName + " not found.");
                    }
                }

                if (!allImported.isEmpty()) {
                    repository.saveAll(allImported);
                    System.out.println("Successfully seeded " + allImported.size() + " total ISIN records into MongoDB.");
                } else {
                    System.out.println("No records found to seed. Database remains empty.");
                }
            }
        };
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
}
