package com.example.quizify.Services;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.example.quizify.Models.QuestionSet;
import com.example.quizify.Models.QuestionWrapper;
import com.example.quizify.Models.Quiz;
import com.example.quizify.Models.QuizResult;
import com.example.quizify.Models.QuestionAnswerReview;
import com.example.quizify.Models.Response;
import com.example.quizify.Models.ModelUser;
import com.example.quizify.Models.UserPerformance;
import com.example.quizify.Repositories.QuestionRepo;
import com.example.quizify.Repositories.QuizRepo;
import com.example.quizify.Repositories.UserPerformanceRepo;
import com.example.quizify.Repositories.JpaRepo4Users;

@Service
public class QuizService {

    private final ConcurrentHashMap<Integer, Quiz> quizCache = new ConcurrentHashMap<>();

    private final ConcurrentHashMap<Integer, Quiz> persistentQuizCache = new ConcurrentHashMap<>();

    private final AtomicInteger idCounter = new AtomicInteger(1);

    @Autowired
    private QuestionRepo questionRepo;

    @Autowired
    private QuizRepo quizRepo;

    @Autowired
    private UserPerformanceRepo userPerformanceRepo;

    @Autowired
    private JpaRepo4Users userRepo;

    // Direct Play - Transient Quiz (in-memory only)
    // Not saved in DB
    public Quiz createQuiz(String category, int numQ, String title, String difficulty) {
        List<QuestionSet> questions;
        if (difficulty == null || difficulty.trim().isEmpty() || difficulty.equalsIgnoreCase("Any")) {
            questions = questionRepo.findRandomQuestionsByCategory(category, numQ);
        } else {
            questions = questionRepo.findRandomQuestionsByCategoryAndDifficulty(category, difficulty, numQ);
        }

        Quiz quiz = new Quiz();
        quiz.setId(idCounter.getAndIncrement());
        quiz.setTitle(title);
        quiz.setCategory(category);
        quiz.setDifficulty(difficulty != null ? difficulty : "Any");
        quiz.setQuestions(questions);

        quizCache.put(quiz.getId(), quiz);
        return quiz;
    }

    // Shared Quiz - Persistent Quiz (saved to Database)
    public Quiz createPersistentQuiz(String category, int numQ, String title, String difficulty, String visibility,
            String creatorEmail) {

        List<QuestionSet> questions;
        if (difficulty == null || difficulty.trim().isEmpty() || difficulty.equalsIgnoreCase("Any")) {
            questions = questionRepo.findRandomQuestionsByCategory(category, numQ);
        } else {
            questions = questionRepo.findRandomQuestionsByCategoryAndDifficulty(category, difficulty, numQ);
        }

        if (questions == null || questions.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "No questions found in this category/difficulty combination!");
        }

        ModelUser creator = userRepo.findUserByemail(creatorEmail)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Creator user not found"));

        Quiz quiz = new Quiz();
        quiz.setTitle(title);
        quiz.setCategory(category);
        quiz.setDifficulty(difficulty);
        quiz.setQuestions(questions);
        quiz.setCreator(creator);
        quiz.setVisibility(visibility != null ? visibility.toUpperCase() : "PUBLIC");

        // DB store
        Quiz savedQuiz = quizRepo.save(quiz);

        persistentQuizCache.put(savedQuiz.getId(), savedQuiz);
        return savedQuiz;
    }

    // Fetch Quiz by ID with Access Control and Cache check
    public Quiz getQuizById(int id, String userEmail, String userRole) {
        // 1. Check in-memory persistent cache
        Quiz quiz = persistentQuizCache.get(id);

        if (quiz == null) {
            // 2. Query DB
            quiz = quizRepo.findById(id)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Quiz not found"));
            persistentQuizCache.put(quiz.getId(), quiz);
        }

        // 3. Perform Access Control check
        if ("PRIVATE".equalsIgnoreCase(quiz.getVisibility())) {
            boolean isCreator = quiz.getCreator() != null && quiz.getCreator().getEmail().equalsIgnoreCase(userEmail);
            boolean isAdmin = "ADMIN".equalsIgnoreCase(userRole);
            if (!isCreator && !isAdmin) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied: This quiz is private!");
            }
        }

        return quiz;
    }

    // Wrap Quiz Questions for playing
    public List<QuestionWrapper> getQuizQuestions(int id, String userEmail, String userRole) {
        // Try transient quiz cache first
        Quiz quiz = quizCache.get(id);

        if (quiz == null) {
            // Check persistent quiz (requires ownership check)
            quiz = getQuizById(id, userEmail, userRole);
        }

        List<QuestionSet> questionsFromDb = quiz.getQuestions();
        List<QuestionWrapper> questionsForUser = new ArrayList<>();

        for (QuestionSet q : questionsFromDb) {
            List<String> options = new ArrayList<>();
            options.add(q.getOption1());
            options.add(q.getOption2());
            options.add(q.getOption3());
            options.add(q.getAnswer());
            Collections.shuffle(options);

            QuestionWrapper qw = new QuestionWrapper(
                    q.getId(),
                    q.getQuestion(),
                    options.get(0),
                    options.get(1),
                    options.get(2),
                    options.get(3));
            questionsForUser.add(qw);
        }

        return questionsForUser;
    }

    // Submit played Quiz responses and log User Performance
    public QuizResult calculateResult(int id, List<Response> responses, String userEmail, String userRole) {
        Quiz quiz = quizCache.remove(id);

        if (quiz == null) {
            // Fetch persistent quiz
            quiz = getQuizById(id, userEmail, userRole);
        }

        List<QuestionSet> questions = quiz.getQuestions();
        int score = 0;
        List<QuestionAnswerReview> reviews = new ArrayList<>();

        for (QuestionSet question : questions) {
            Optional<Response> userRespOpt = responses.stream()
                    .filter(r -> r.getId() == question.getId())
                    .findFirst();

            String userAns = userRespOpt.isPresent() ? userRespOpt.get().getResponse() : "";
            String correctAns = question.getAnswer();
            boolean isCorrect = correctAns.trim().equalsIgnoreCase(userAns.trim());

            if (isCorrect) {
                score++;
            }

            reviews.add(new QuestionAnswerReview(
                    question.getId(),
                    question.getQuestion(),
                    userAns.isEmpty() ? "Skipped" : userAns,
                    correctAns,
                    isCorrect));
        }

        // Save performance log in database
        ModelUser user = userRepo.findUserByemail(userEmail)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        double percentage = questions.isEmpty() ? 0.0 : ((double) score / questions.size()) * 100;

        UserPerformance performance = new UserPerformance();
        performance.setUser(user);
        performance.setQuizTitle(quiz.getTitle());
        performance.setCategory(quiz.getCategory() != null ? quiz.getCategory() : "Direct Play");
        performance.setDifficulty(quiz.getDifficulty() != null ? quiz.getDifficulty() : "Any");
        performance.setScore(score);
        performance.setTotalQuestions(questions.size());
        performance.setPercentage(Math.round(percentage * 10.0) / 10.0); // round to 1 decimal place

        userPerformanceRepo.save(performance);

        return new QuizResult(score, questions.size(), reviews);
    }

    // Get all persistent quizzes (Admins only)
    public List<Quiz> getAllPersistentQuizzes() {
        return quizRepo.findAll();
    }

    // Delete quiz from database and evict from cache (Admins only)
    public void deleteQuiz(int id) {
        persistentQuizCache.remove(id);
        quizRepo.deleteById(id);
    }

    // Clear persistent quiz cache (called when questions are updated/deleted)
    public void clearPersistentQuizCache() {
        persistentQuizCache.clear();
    }

}
