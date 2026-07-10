package com.transactionconfig.isin.repository;

import com.transactionconfig.isin.model.Isin;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface IsinRepository extends MongoRepository<Isin, String> {

    Optional<Isin> findByIsin(String isin);

    boolean existsByIsin(String isin);
}
