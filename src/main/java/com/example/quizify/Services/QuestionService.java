package com.example.quizify.Services;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.example.quizify.Models.QuestionSet;
import com.example.quizify.Repositories.QuestionRepo;

@Service
public class QuestionService {

    private QuestionRepo questionRepo;

    private QuizService quizService;

    QuestionService(QuestionRepo qRepo, QuizService qService) {
        questionRepo = qRepo;
        quizService = qService;
    }

    public List<QuestionSet> getAllQues() {
        return questionRepo.findAll();
    }

    public void saveNewQues(QuestionSet newQues) {
        try {
            questionRepo.save(newQues);
            // Evict persistent cache when a new question is added
            quizService.clearPersistentQuizCache();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public List<QuestionSet> getQuesByCategory(String category) {
        return questionRepo.findByCategory(category);
    }

    public List<QuestionSet> getQuesByDifficultyLevel(String level) {
        return questionRepo.findByDifficulty(level);
    }

    // Delete question by ID after cleaning up quiz associations
    public void deleteQuestion(int id) {
        if (!questionRepo.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Question not found");
        }
        // 1. Remove references from quiz join table
        questionRepo.deleteQuizAssociations(id);

        // 2. Delete question from DB
        questionRepo.deleteById(id);

        // 3. Clear cache
        quizService.clearPersistentQuizCache();
    }

    // Edit/update existing question
    public QuestionSet updateQuestion(int id, QuestionSet updated) {
        QuestionSet existing = questionRepo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Question not found"));

        existing.setQuestion(updated.getQuestion());
        existing.setAnswer(updated.getAnswer());
        existing.setCategory(updated.getCategory());
        existing.setDifficulty(updated.getDifficulty());
        existing.setOption1(updated.getOption1());
        existing.setOption2(updated.getOption2());
        existing.setOption3(updated.getOption3());

        QuestionSet saved = questionRepo.save(existing);

        // Clear cache
        quizService.clearPersistentQuizCache();

        return saved;
    }

}
