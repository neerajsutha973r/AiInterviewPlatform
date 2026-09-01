import { GoogleGenAI } from "@google/genai";

import {
  findSimilarQuestions,
  isSimilarToExistingQuestion,
} from "./questionRetrieval.js";


const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const generateQuestions = async (role, difficulty) => {

  // Retrieve previous questions
  const previousQuestions = await findSimilarQuestions(
    `Interview questions for ${role} at ${difficulty} difficulty`,
    role,
    difficulty,
    10
  );

  const previousQuestionsText = previousQuestions.length
    ? previousQuestions
        .map(
          (item, index) =>
            `${index + 1}. ${item.question}`
        )
        .join("\n")
    : "No previous questions available.";

  const prompt = `
You are an expert technical interviewer.

You MUST generate EXACTLY 10 interview questions.

Role: ${role}
Difficulty: ${difficulty}

IMPORTANT:

The following questions have already been asked.

DO NOT generate questions that are:

- Identical
- Substantially similar
- Simple rewordings
- The same scenario with different wording

Previously asked questions:

${previousQuestionsText}

Generate 10 genuinely different interview questions.

Requirements:

- Generate EXACTLY 10 questions.
- Each question must contain between 20 and 25 words.
- Ask open-ended questions.
- Questions should encourage detailed explanations.
- Questions should sound like a real interviewer.
- Avoid yes/no questions.
- Include practical scenarios whenever possible.
- Do not simply rephrase previous questions.
- Explore different concepts and scenarios.
- Maintain the requested difficulty.
- Every question must be relevant to the role.

Return ONLY a valid JSON array.

Each object must contain:

{
  "question": "...",
  "correct_answer": "..."
}

Do not include markdown.
Do not include \`\`\`.
Do not include explanations outside the JSON array.
`;


  const response = await ai.models.generateContent({
    model: "gemini-3.1-flash-lite",
    contents: prompt,
  });

  const content = response.text;

  try {
    const questions = JSON.parse(content);

    if (!Array.isArray(questions)) {
      throw new Error(
        "Gemini did not return an array"
      );
    }

    if (questions.length !== 10) {
      throw new Error(
        `Expected 10 questions, received ${questions.length}`
      );
    }
    const uniqueQuestions = [];

    for (const item of questions) {

      const result =
        await isSimilarToExistingQuestion(
          item.question,
          role,
          difficulty,
          0.85
        );

      if (!result.similar) {

        uniqueQuestions.push({
          ...item,
          embedding: result.embedding,
        });

      } else {
        console.log("rejected");
      }
    }
    return uniqueQuestions;
  } catch (error) {
    throw new Error(
      `Invalid JSON returned from Gemini: ${error.message}`
    );
  }
};

const evaluateAnswer = async (
  question,
  correctAnswer,
  candidateAnswer
) => {
  const prompt = `
You are an expert technical interviewer.

Evaluate the candidate's answer.

Question:
${question}

Expected Answer:
${correctAnswer}

Candidate Answer:
${candidateAnswer}

Compare the candidate's answer with the expected answer.

Evaluate:

- Accuracy
- Completeness
- Technical correctness

Return ONLY valid JSON in this format:

{
  "score": 0-10,
  "feedback": "Constructive feedback"
}

Do not include markdown.
Do not include explanations outside JSON.
`;


  const response = await ai.models.generateContent({
    model: "gemini-3.1-flash-lite",
    contents: prompt,
  });
  const content = response.text;

  try {
    return JSON.parse(content);

  } catch {
    throw new Error(
      "Invalid JSON returned from Gemini"
    );
  }
};
export default {
  generateQuestions,
  evaluateAnswer,
};