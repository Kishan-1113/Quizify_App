package com.example.quizify.Models;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class QuestionAnswerReview {

    private int questionId;
    private String questionText;
    private String userResponse;
    private String correctAnswer;
    private boolean isCorrect;

}
