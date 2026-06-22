package com.example.quizify.Config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import com.example.quizify.Models.PremiumPlans;
import com.example.quizify.Repositories.PremiumPlansRepo;

@Component
public class DataInitializer implements CommandLineRunner {

    private PremiumPlansRepo plansRepo;

    DataInitializer(PremiumPlansRepo plans) {
        plansRepo = plans;
    }

    @Override
    public void run(String... args) throws Exception {
        if (plansRepo.count() == 0) {
            PremiumPlans plan1 = new PremiumPlans();
            plan1.setPlanName("1-Month Premium");
            plan1.setPrice(199);
            plan1.setValidity(30);

            PremiumPlans plan2 = new PremiumPlans();
            plan2.setPlanName("3-Month Premium");
            plan2.setPrice(499);
            plan2.setValidity(90);

            plansRepo.save(plan1);
            plansRepo.save(plan2);
            System.out.println("Initialized 1-Month and 3-Month premium plans in database.");
        }
    }
}
