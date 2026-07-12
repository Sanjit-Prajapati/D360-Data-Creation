package com.transactionconfig.isin.repository;

import com.transactionconfig.isin.model.Isin;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.Set;

@Repository
public interface IsinRepository extends MongoRepository<Isin, String> {

    Optional<Isin> findByIsin(String isin);
    
    List<Isin> findByIsinIn(Set<String> isins);

    boolean existsByIsin(String isin);
}
