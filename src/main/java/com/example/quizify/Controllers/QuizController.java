package com.example.quizify.Controllers;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.quizify.Models.QuestionWrapper;
import com.example.quizify.Models.Quiz;
import com.example.quizify.Models.QuizInfoResponse;
import com.example.quizify.Models.QuizResponse;
import com.example.quizify.Models.QuizResult;
import com.example.quizify.Models.Response;
import com.example.quizify.Services.QuizService;

@RestController
@RequestMapping("/quiz")
@CrossOrigin
public class QuizController {

    @Autowired
    private QuizService quizService;

    // Fetch quiz info/metadata securely by ID (access control check is performed)
    @GetMapping("/info/{id}")
    public ResponseEntity<QuizInfoResponse> getQuizInfo(@PathVariable int id, Authentication authentication) {
        String email = authentication.getName();
        String role = authentication.getAuthorities().stream()
                .map(a -> a.getAuthority().replace("ROLE_", ""))
                .findFirst().orElse("USER");
        Quiz quiz = quizService.getQuizById(id, email, role);
        QuizInfoResponse info = new QuizInfoResponse(
                quiz.getId(),
                quiz.getTitle(),
                quiz.getCategory(),
                quiz.getDifficulty(),
                quiz.getQuestions().size());
        return ResponseEntity.ok(info);
    }

    // Transient play - generate and load quiz (in-memory play session)
    @PostMapping("/create")
    public ResponseEntity<Integer> createQuiz(
            @RequestParam String category,
            @RequestParam int numQ,
            @RequestParam String title,
            @RequestParam(required = false, defaultValue = "Any") String difficulty) {
        Quiz quiz = quizService.createQuiz(category, numQ, title, difficulty);
        return ResponseEntity.status(HttpStatus.CREATED).body(quiz.getId());
    }

    // Shared quiz - create and persist quiz structure to DB
    @PostMapping("/create-persistent")
    public ResponseEntity<Integer> createPersistentQuiz(
            @RequestParam String category,
            @RequestParam int numQ,
            @RequestParam String title,
            @RequestParam(required = false, defaultValue = "Any") String difficulty,
            @RequestParam(required = false, defaultValue = "PUBLIC") String visibility,
            Authentication authentication) {
        String email = authentication.getName();
        Quiz quiz = quizService.createPersistentQuiz(category, numQ, title, difficulty, visibility, email);
        return ResponseEntity.status(HttpStatus.CREATED).body(quiz.getId());
    }

    // Fetch quiz by ID (Supports both transient in-memory and persistent DB
    // quizzes)
    @GetMapping("/get/{id}")
    public ResponseEntity<List<QuestionWrapper>> getQuizQuestions(
            @PathVariable int id,
            Authentication authentication) {
        String email = authentication.getName();
        String role = authentication.getAuthorities().stream()
                .map(a -> a.getAuthority().replace("ROLE_", ""))
                .findFirst().orElse("USER");
        List<QuestionWrapper> questions = quizService.getQuizQuestions(id, email, role);
        return ResponseEntity.ok(questions);
    }

    // Submit responses and score user quiz play
    @PostMapping("/submit/{id}")
    public ResponseEntity<QuizResult> submitQuiz(
            @PathVariable int id,
            @RequestBody List<Response> responses,
            Authentication authentication) {
        String email = authentication.getName();
        String role = authentication.getAuthorities().stream()
                .map(a -> a.getAuthority().replace("ROLE_", ""))
                .findFirst().orElse("USER");
        QuizResult result = quizService.calculateResult(id, responses, email, role);
        return ResponseEntity.ok(result);
    }

    // Get all persistent quizzes (Admins only)
    @GetMapping("/all")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<QuizResponse>> getAllQuizzes() {
        List<Quiz> quizzes = quizService.getAllPersistentQuizzes();
        List<QuizResponse> response = quizzes.stream()
                .map(q -> new QuizResponse(
                        q.getId(),
                        q.getTitle(),
                        q.getCategory(),
                        q.getDifficulty(),
                        q.getVisibility(),
                        q.getCreator() != null ? new QuizResponse.CreatorDto(q.getCreator().getEmail())
                                : new QuizResponse.CreatorDto("System")))
                .collect(java.util.stream.Collectors.toList());
        return ResponseEntity.ok(response);
    }

    // Delete a quiz (Admins only)
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<String> deleteQuiz(@PathVariable int id) {
        quizService.deleteQuiz(id);
        return ResponseEntity.ok("Quiz deleted successfully");
    }

}
