package com.example.quizify.Services;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Service;

import com.example.quizify.Models.PremiumPlans;
import com.example.quizify.Models.ModelUser;
import com.example.quizify.Repositories.PremiumPlansRepo;
import com.example.quizify.Repositories.JpaRepo4Users;

@Lazy
@Service
public class PaymentService {

    private PremiumPlansRepo plansRepo;

    private JpaRepo4Users userRepo;

    PaymentService(PremiumPlansRepo pRepo, JpaRepo4Users uRepo4Users) {
        plansRepo = pRepo;
        userRepo = uRepo4Users;
    }

    public void savePlan(PremiumPlans plan) {
        plansRepo.save(plan);
    }

    public List<PremiumPlans> getAllPlans() {
        return plansRepo.findAll();
    }

    public boolean subscribeUser(String email, Long planId) {
        ModelUser user = userRepo.findUserByemail(email).orElse(null);
        if (user == null) {
            return false;
        }

        PremiumPlans plan = plansRepo.findById(planId).orElse(null);
        if (plan == null) {
            return false;
        }

        if (!"ADMIN".equalsIgnoreCase(user.getRole())) {
            user.setRole("PREMIUM");
            userRepo.save(user);
        }
        return true;
    }

}