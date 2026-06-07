package com.example.quizify.Repositories;

import org.springframework.context.annotation.Lazy;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.example.quizify.Models.PremiumPlans;

@Repository
@Lazy
public interface PremiumPlansRepo extends JpaRepository<PremiumPlans, Long> {

}
