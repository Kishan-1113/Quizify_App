package com.example.quizify.Repositories;

import java.util.List;

import org.springframework.context.annotation.Lazy;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.example.quizify.Models.ModelUser;
import com.example.quizify.Models.UserPerformance;

@Repository
@Lazy
public interface UserPerformanceRepo extends JpaRepository<UserPerformance, Long> {
    List<UserPerformance> findByUserOrderByTimestampDesc(ModelUser user);

    List<UserPerformance> findAllByOrderByTimestampDesc();
}
