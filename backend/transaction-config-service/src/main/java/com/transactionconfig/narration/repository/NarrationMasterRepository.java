package com.transactionconfig.narration.repository;

import com.transactionconfig.narration.entity.NarrationMaster;
import com.transactionconfig.narration.enums.FipId;
import com.transactionconfig.narration.enums.TransactionType;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface NarrationMasterRepository extends MongoRepository<NarrationMaster, String> {

    @Query(value = "{ 'fipId': ?0, 'transactionType': ?1, 'narrationRegex': ?2 }", exists = true)
    boolean existsByFipIdAndTransactionTypeAndNarrationRegex(
            FipId fipId, TransactionType transactionType, String narrationRegex);

    @Query("{ 'fipId': ?0, 'transactionType': ?1, 'narrationRegex': ?2 }")
    Optional<NarrationMaster> findByFipIdAndTransactionTypeAndNarrationRegex(
            FipId fipId, TransactionType transactionType, String narrationRegex);
}
