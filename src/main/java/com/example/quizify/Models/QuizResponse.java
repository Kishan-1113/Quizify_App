package com.example.quizify.Models;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class QuizResponse {
    private int id;
    private String title;
    private String category;
    private String difficulty;
    private String visibility;
    private CreatorDto creator;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CreatorDto {
        private String email;
    }
}
