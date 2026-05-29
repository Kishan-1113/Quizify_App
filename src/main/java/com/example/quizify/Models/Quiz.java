package com.example.quizify.Models;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.util.List;

@Getter
@Setter
@Entity
@Table(name = "quizzes")
public class Quiz {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int id;

    @Column(nullable = false)
    private String title;

    private String category;

    private String difficulty;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "quiz_questions", joinColumns = @JoinColumn(name = "quiz_id", referencedColumnName = "id"), inverseJoinColumns = @JoinColumn(name = "question_id", referencedColumnName = "id"))
    private List<QuestionSet> questions;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "creator_id")
    private ModelUser creator;

    @Column(nullable = false)
    private String visibility = "PUBLIC"; // PUBLIC or PRIVATE

}
