package com.example.quizify.Models;

import org.springframework.context.annotation.Lazy;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;

@Entity
@Data
@Table(name = "quizapp_plans")
@Lazy
public class PremiumPlans {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private long planId;

    @Column(nullable = false)
    private String planName;

    @Column(nullable = false)
    private int price;

    @Column(nullable = false)
    private int validity; // Will be counted as the number of days that particular plan is valid till

}
