package com.example.quizify.Models;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "QuestionSet")
public class QuestionSet {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE)
    private int id;

    @Column(nullable = false)
    private String question;
    @Column(nullable = false)
    private String answer;
    @Column(nullable = false)
    private String category;
    @Column(nullable = false)
    private String difficulty;
    @Column(nullable = false)
    private String option1;
    @Column(nullable = false)
    private String option2;
    @Column(nullable = false)
    private String option3;

}
