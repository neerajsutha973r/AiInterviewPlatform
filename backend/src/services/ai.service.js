import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const generateQuestions = async (role, difficulty) => {
  const prompt = `
You are an expert technical interviewer.

You MUST generate EXACTLY 10 interview questions.
NOT 2.
NOT 3.
NOT 4.
EXACTLY 10.

Role: ${role}
Difficulty: ${difficulty}

Return ONLY a valid JSON array.

Requirements:
- Each question should be between 20 and 25 words.
- Ask open-ended questions that encourage detailed explanations.
- Questions should sound like a real interviewer speaking.
- Avoid yes/no questions.
- Include practical scenarios whenever possible.

Return ONLY a valid JSON array.

Example format:

[
  {
    "question": "Imagine you are developing a large React application. Explain how components communicate, manage state efficiently, and improve application performance.",
    "correct_answer": "In a large React application, components communicate primarily through props..."
  }
]

Do not include markdown.
`;

  const response = await ai.models.generateContent({
    model: "gemini-3.1-flash-lite",
    contents: prompt,
  });

  const content = response.text;
 
  try {
    return JSON.parse(content);
  } catch {
    throw new Error("Invalid JSON returned from Gemini");
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
    throw new Error("Invalid JSON returned from Gemini");
  }
};


export default {
  generateQuestions,
  evaluateAnswer,
};