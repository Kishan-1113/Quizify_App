package com.example.quizify.Models;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class QuizResult {

    private int score;
    private int totalQuestions;
    private List<QuestionAnswerReview> reviews;

}
