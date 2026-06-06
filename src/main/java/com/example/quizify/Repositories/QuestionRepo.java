package com.example.quizify.Repositories;

import java.util.List;

import org.springframework.context.annotation.Lazy;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import com.example.quizify.Models.QuestionSet;

@Repository
@Lazy
public interface QuestionRepo extends JpaRepository<QuestionSet, Integer> {

    List<QuestionSet> findByCategory(String category);

    List<QuestionSet> findByDifficulty(String difficulty);

    @Query(value = "SELECT * FROM question_set q WHERE LOWER(q.category) = LOWER(:category) ORDER BY RANDOM() LIMIT :numQ", nativeQuery = true)
    List<QuestionSet> findRandomQuestionsByCategory(@Param("category") String category, @Param("numQ") int numQ);

    @Query(value = "SELECT * FROM question_set q WHERE LOWER(q.category) = LOWER(:category) AND LOWER(q.difficulty) = LOWER(:difficulty) ORDER BY RANDOM() LIMIT :numQ", nativeQuery = true)
    List<QuestionSet> findRandomQuestionsByCategoryAndDifficulty(@Param("category") String category,
            @Param("difficulty") String difficulty, @Param("numQ") int numQ);

    @Modifying
    @Transactional
    @Query(value = "DELETE FROM quiz_questions WHERE question_id = :questionId", nativeQuery = true)
    void deleteQuizAssociations(@Param("questionId") int questionId);

}
