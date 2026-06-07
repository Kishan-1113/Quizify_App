package com.example.quizify.Services;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Service;

import com.example.quizify.Models.PremiumPlans;
import com.example.quizify.Repositories.PremiumPlansRepo;

@Lazy
@Service
public class PaymentService {

    @Autowired
    private PremiumPlansRepo plansRepo;

    public void savePlan(PremiumPlans plan) {
        plansRepo.save(plan);
    }

    public List<PremiumPlans> getAllPlans() {
        return plansRepo.findAll();
    }

}