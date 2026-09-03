import { GoogleGenAI } from "@google/genai";

import {
  isSimilarToExistingQuestion,
} from "./questionRetrieval.js";


const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});


// ======================================================
// DECIDE NEXT DIFFICULTY
// ======================================================

const getNextDifficulty = (
  difficulty,
  score
) => {

  // Poor performance
  if (score <= 4) {

    if (difficulty === "Hard") {
      return "Medium";
    }

    return "Easy";
  }


  // Strong performance
  if (score >= 8) {

    if (difficulty === "Easy") {
      return "Medium";
    }

    return "Hard";
  }


  // Average performance
  return difficulty;
};


// ======================================================
// PARSE GEMINI JSON
// ======================================================

const parseGeminiJSON = (text) => {

  try {

    // Remove markdown code fences if Gemini adds them
    let cleanedText = text.trim();

    if (cleanedText.startsWith("```json")) {
      cleanedText = cleanedText
        .replace(/^```json\s*/, "")
        .replace(/\s*```$/, "");
    }

    else if (cleanedText.startsWith("```")) {
      cleanedText = cleanedText
        .replace(/^```\s*/, "")
        .replace(/\s*```$/, "");
    }


    return JSON.parse(cleanedText);

  } catch (error) {

    console.error(
      "Gemini JSON parsing error:",
      error
    );

    throw new Error(
      "Gemini returned invalid JSON"
    );

  }

};


// ======================================================
// GENERATE NEXT ADAPTIVE QUESTION
// ======================================================

export const generateNextQuestion = async ({
  userId,
  role,
  difficulty,
  previousQuestion = null,
  previousAnswer = null,
  previousScore = null,
  previousSkill = null,
  previousTopic = null,
}) => {


  // ----------------------------------------------------
  // 1. Determine next difficulty
  // ----------------------------------------------------

  const nextDifficulty =
    previousScore === null
      ? difficulty
      : getNextDifficulty(
          difficulty,
          previousScore
        );


  // ----------------------------------------------------
  // 2. Build adaptive instruction
  // ----------------------------------------------------

  let instruction = `
Generate the first interview question.
`;


  // ----------------------------------------------------
  // Poor answer
  // ----------------------------------------------------

  if (
    previousScore !== null &&
    previousScore <= 4
  ) {

    instruction = `
The candidate performed poorly on the previous question.

Previous question:
${previousQuestion}

Candidate answer:
${previousAnswer}

Score:
${previousScore}/10

Skill:
${previousSkill}

Topic:
${previousTopic}

Ask a new question about the same skill or topic,
but make it easier.

Use a different approach from the previous question.

Do not repeat the previous question.
Do not simply rephrase the previous question.
`;

  }


  // ----------------------------------------------------
  // Strong answer
  // ----------------------------------------------------

  else if (
    previousScore !== null &&
    previousScore >= 8
  ) {

    instruction = `
The candidate performed very well on the previous question.

Previous question:
${previousQuestion}

Candidate answer:
${previousAnswer}

Score:
${previousScore}/10

Skill:
${previousSkill}

Topic:
${previousTopic}

Ask a harder question.

The question may explore:

- a deeper concept
- a related concept
- a real-world scenario
- a more complex implementation

Do not repeat the previous question.
Do not simply rephrase the previous question.
`;

  }


  // ----------------------------------------------------
  // Average answer
  // ----------------------------------------------------

  else if (
    previousScore !== null
  ) {

    instruction = `
The candidate gave an average answer.

Previous question:
${previousQuestion}

Candidate answer:
${previousAnswer}

Score:
${previousScore}/10

Skill:
${previousSkill}

Topic:
${previousTopic}

Ask a new question about the same or a related concept.

Keep the difficulty similar.

Do not repeat the previous question.
Do not simply rephrase the previous question.
`;

  }


  // ====================================================
  // 3. TRY GENERATING A UNIQUE QUESTION
  // ====================================================

  const MAX_ATTEMPTS = 100;


  for (
    let attempt = 1;
    attempt <= MAX_ATTEMPTS;
    attempt++
  ) {


    console.log(
      `Generating question - attempt ${attempt}/${MAX_ATTEMPTS}`
    );


    // --------------------------------------------------
    // Add retry instruction
    // --------------------------------------------------

    let retryInstruction = "";


    if (attempt > 1) {

      retryInstruction = `
IMPORTANT:

The previously generated question was too similar
to a question already asked to this candidate.

Generate a substantially different question.

Change the angle, scenario, problem structure,
or concept being tested.

Do NOT simply change a few words.
Do NOT rephrase the previous question.
`;

    }


    // --------------------------------------------------
    // 4. Generate prompt
    // --------------------------------------------------

    const prompt = `
You are an expert technical interviewer.

Role:
${role}

Difficulty:
${nextDifficulty}

${instruction}

${retryInstruction}

Generate EXACTLY ONE interview question.

Requirements:

- Open-ended
- Technical
- Relevant to the role
- Appropriate for the requested difficulty
- Avoid yes/no questions
- Do not repeat previous questions
- Do not simply reword previous questions
- The question must be answerable by a candidate

Return ONLY valid JSON.

The JSON MUST have exactly these fields:

{
  "question": "...",
  "correct_answer": "...",
  "skill": "...",
  "topic": "...",
  "question_type": "..."
}

Rules:

- "question" = the interview question
- "correct_answer" = a strong/reference answer
- "skill" = technical skill being tested
- "topic" = specific topic
- "question_type" must be one of:

  conceptual
  coding
  scenario
  debugging
  follow_up

Do not include markdown.
Do not include explanations outside JSON.
`;


    // --------------------------------------------------
    // 5. Generate question using Gemini
    // --------------------------------------------------

    const response =
      await ai.models.generateContent({

        model:
          "gemini-3.1-flash-lite",

        contents:
          prompt,

      });


    // --------------------------------------------------
    // 6. Parse response
    // --------------------------------------------------

    const data =
      parseGeminiJSON(
        response.text
      );


    // --------------------------------------------------
    // 7. Validate generated question
    // --------------------------------------------------

    if (
      !data.question ||
      !data.correct_answer ||
      !data.skill ||
      !data.topic ||
      !data.question_type
    ) {

      throw new Error(
        "Gemini returned incomplete question data"
      );

    }


    // --------------------------------------------------
    // 8. Validate question type
    // --------------------------------------------------

    const validQuestionTypes = [

      "conceptual",

      "coding",

      "scenario",

      "debugging",

      "follow_up",

    ];


    if (
      !validQuestionTypes.includes(
        data.question_type
      )
    ) {

      throw new Error(
        "Invalid question type returned by Gemini"
      );

    }


    // --------------------------------------------------
    // 9. Check similarity
    // --------------------------------------------------

    const similarity =
      await isSimilarToExistingQuestion(

        data.question,

        userId,

        role,

        0.92

      );


    console.log(
      "Question similarity:",
      similarity.similarity
    );


    // --------------------------------------------------
    // 10. Question is unique
    // --------------------------------------------------

    if (!similarity.similar) {

      console.log(
        `Unique question generated on attempt ${attempt}`
      );


      return {

        rejected:
          false,

        question:
          data.question,

        correct_answer:
          data.correct_answer,

        skill:
          data.skill,

        topic:
          data.topic,

        question_type:
          data.question_type,

        difficulty:
          nextDifficulty,

        embedding:
          similarity.embedding,

      };

    }


    // --------------------------------------------------
    // 11. Question is too similar
    // --------------------------------------------------

    console.log(
      `Question rejected on attempt ${attempt}. ` +
      `Similarity: ${similarity.similarity}`
    );


    // If this was the last attempt,
    // return rejected.
    if (
      attempt === MAX_ATTEMPTS
    ) {

      return {

        rejected:
          true,

        message:
          "Could not generate a sufficiently unique question after multiple attempts.",

        similarity:
          similarity.similarity,

        matchedQuestion:
          similarity.matchedQuestion,

      };

    }

  }

};


// ======================================================
// EVALUATE CANDIDATE ANSWER
// ======================================================

export const evaluateAnswer = async (
  question,
  correctAnswer,
  candidateAnswer
) => {


  const prompt = `
You are an expert technical interviewer.

Question:
${question}

Expected Answer:
${correctAnswer}

Candidate Answer:
${candidateAnswer}

Evaluate the candidate's answer based on:

1. Accuracy
2. Completeness
3. Technical correctness
4. Understanding

Give an integer score from 0 to 10.

Scoring guidelines:

0-2:
Very poor answer.
Little or no understanding.

3-4:
Poor answer.
Some understanding but major mistakes or missing concepts.

5-7:
Average answer.
Generally correct but incomplete or missing important details.

8-9:
Strong answer.
Correct, detailed and demonstrates good understanding.

10:
Excellent answer.
Accurate, complete and demonstrates deep understanding.

Return ONLY valid JSON.

{
  "score": 0,
  "feedback": "Constructive feedback"
}

Rules:

- score MUST be an integer from 0 to 10
- feedback should explain strengths and weaknesses
- feedback should be constructive
- do not include markdown
- do not include explanations outside JSON
`;


  // ----------------------------------------------------
  // Generate evaluation
  // ----------------------------------------------------

  const response =
    await ai.models.generateContent({

      model:
        "gemini-3.1-flash-lite",

      contents:
        prompt,

    });


  // ----------------------------------------------------
  // Parse evaluation
  // ----------------------------------------------------

  const evaluation =
    parseGeminiJSON(
      response.text
    );


  // ----------------------------------------------------
  // Validate score
  // ----------------------------------------------------

  if (
    typeof evaluation.score !==
      "number" ||

    !Number.isInteger(
      evaluation.score
    ) ||

    evaluation.score < 0 ||

    evaluation.score > 10
  ) {

    throw new Error(
      "Invalid score returned by Gemini"
    );

  }


  // ----------------------------------------------------
  // Validate feedback
  // ----------------------------------------------------

  if (
    !evaluation.feedback
  ) {

    throw new Error(
      "Gemini returned no feedback"
    );
  }
  
    return {

    score:
      evaluation.score,

    feedback:
      evaluation.feedback,

  };
}

  // ======================================================
// GENERATE NATURAL INTERVIEWER RESPONSE
// ======================================================

export const generateInterviewerResponse = async (
  question,
  candidateAnswer,
  score
) => {

  const prompt = `
You are a professional technical interviewer conducting a live interview.

Previous question:
${question}

Candidate answer:
${candidateAnswer}

Internal evaluation score:
${score}/10

Generate a short natural response that the interviewer would say
after hearing the candidate's answer.

Rules:

- Sound like a real human interviewer.
- Be professional, calm, and encouraging.
- Do Not ask any question in this response
- Do NOT reveal the numerical score.
- Do NOT reveal the expected/correct answer.
- Do NOT give detailed teaching or correction.
- Do NOT ask the next question.
- Keep it to 1 or 2 sentences.
- For a strong answer, acknowledge the candidate's reasoning.
- For an average answer, acknowledge the response and indicate
  that there is more to explore.
- For a weak answer, stay encouraging and transition naturally.
- Avoid repetitive phrases such as "Good answer" every time.
- Do not use markdown.
- Return ONLY the interviewer response.
`;

  try {

    const response =
      await ai.models.generateContent({

        model:
          "gemini-3.1-flash-lite",

        contents:
          prompt,

      });


    const responseText =
      response.text?.trim();


    if (!responseText) {

      return "Thank you for your response. Let's move on.";

    }


    return responseText;

  } catch (error) {

    console.error(
      "Interviewer response generation error:",
      error
    );


    // Fallback so that a temporary Gemini
    // response-generation failure does not
    // break the interview.

    if (score >= 8) {

      return "That's a strong response. Let's explore this further.";

    }

    if (score >= 5) {

      return "That's a reasonable response. Let's move on to the next part.";

    }

    return "That's okay. Let's approach the next question from another angle.";

  }

};

// ======================================================
// GENERATE INTERVIEW CLOSING
// ======================================================

export const generateInterviewClosing = async (
  role,
  totalQuestions
) => {

  const prompt = `
You are a professional technical interviewer.

The technical interview for the role of ${role}
has just been completed.

The candidate answered all ${totalQuestions} questions.

Give a short, natural closing statement to end the interview.

Rules:

- Sound like a real human interviewer.
- Be professional and encouraging.
- Thank the candidate for their time.
- Tell them the interview is complete.
- Do not reveal the score.
- Do not provide detailed feedback.
- Do not ask another question.
- Keep it to 2 or 3 sentences.
- Do Not tell our recruiter or HR team will contact them.
- Return only the spoken closing statement.
`;

  try {

    const response =
      await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: prompt,
      });

    const text =
      response.text?.trim();

    if (!text) {

      return "Great job. That concludes your interview. Thank you for your time.";

    }

    return text;

  } catch (error) {

    console.error(
      "Interview closing generation error:",
      error
    );

    return (
      "Great job. That concludes your interview. " +
      "Thank you for taking the time to complete the interview."
    );

  }

};