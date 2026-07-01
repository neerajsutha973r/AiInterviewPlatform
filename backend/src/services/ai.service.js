import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const generateQuestions = async (role, difficulty) => {

  const prompt = `
You are an expert technical interviewer.

Generate exactly 10 interview questions.

Role: ${role}
Difficulty: ${difficulty}

Return ONLY a valid JSON array.

Requirements:
- Each question should be between 80 and 150 words.
- Ask open-ended questions that encourage detailed explanations.
- Questions should sound like a real interviewer speaking.
- Avoid yes/no questions.
- Include practical scenarios whenever possible.

And each time please give different questions, do not repeat the same questions.

Example:

Return ONLY a valid JSON array.

Example:

[
  {
    "question": "Imagine you are developing a large React application. Explain how components communicate, manage state efficiently, and improve application performance.",
    "correct_answer": "In a large React application, components communicate primarily through props, where parent components pass data and callback functions to child components. When multiple unrelated components need access to the same data, I use the Context API or a state management library like Redux or Zustand to avoid prop drilling and improve maintainability.

For efficient state management, I keep state as close as possible to where it is needed and avoid unnecessary global state. I never mutate state directly; instead, I update it using React's state setters to ensure predictable rendering. I also separate local UI state from shared application state.

To improve application performance, I use React.memo to prevent unnecessary component re-renders, useMemo for expensive calculations, and useCallback to memoize functions passed to child components. I implement lazy loading and code splitting using React.lazy and Suspense to reduce the initial bundle size. For large lists, I use virtualization libraries such as react-window. I also optimize API calls, minimize unnecessary state updates, and use React Developer Tools to identify rendering bottlenecks. These practices make the application faster, more scalable, and easier to maintain."
  
}
]


Do not include markdown.
`;

  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.7,
  });

  const content = response.choices[0].message.content;

      try {
           return JSON.parse(content);
       }          catch {
       throw new Error("Invalid JSON returned from Groq");
      }
    };

const evaluateAnswer = async (question, correctAnswer,candidateAnswer) => {
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

Return ONLY valid JSON.

{
  "score": 0-10,
  "feedback": "Constructive feedback"
}

Do not include markdown.
Do not include explanations outside JSON.
`;

  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.2,
  });

  const content = response.choices[0].message.content;

  try {
   return JSON.parse(content);
  } catch {
    throw new Error("Invalid JSON returned from Groq");
  }
};

export default {
  generateQuestions,
  evaluateAnswer,
};
