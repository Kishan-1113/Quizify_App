package com.example.quizify.Controllers;

import org.springframework.web.bind.annotation.RestController;

import com.example.quizify.Models.PremiumPlans;
import com.example.quizify.Services.PaymentService;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.graphql.GraphQlProperties.Http;
import org.springframework.context.annotation.Lazy;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

@RestController
@Lazy
public class PaymentController {

    @Autowired
    private PaymentService paymentService;

    @GetMapping("/plans")
    public ResponseEntity<List<PremiumPlans>> getAllPlans() {
        return ResponseEntity.status(HttpStatus.OK).body(paymentService.getAllPlans());
    }

    @PostMapping("/goPremium")
    public String postMethodName(@RequestBody String entity) {
        // TODO: process POST request

        return entity;
    }

}
