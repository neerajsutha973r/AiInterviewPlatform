import { GoogleGenAI } from "@google/genai";
import db from "../db/connection.js";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export const findSimilarQuestions = async (
  newQuestion,
  role,
  difficulty,
  limit = 10
) => {

  const response = await ai.models.embedContent({
    model: "gemini-embedding-001",
    contents: newQuestion,
    config: {
      outputDimensionality: 768,
    },
  });

  const embedding = response.embeddings[0].values;

  const result = await db.query(
    `
    SELECT
      q.id,
      q.question,
      i.role,
      i.difficulty,
      1 - (q.embedding <=> $1::vector) AS similarity
    FROM questions q
    JOIN interviews i
      ON q.interview_id = i.id
    WHERE q.embedding IS NOT NULL
      AND i.role = $2
      AND i.difficulty = $3
    ORDER BY q.embedding <=> $1::vector
    LIMIT $4;
    `,
    [
      JSON.stringify(embedding),
      role,
      difficulty,
      limit,
    ]
  );

  return result.rows;
};


export const isSimilarToExistingQuestion = async (
  question,
  role,
  difficulty,
  threshold = 0.85
) => {

  const response = await ai.models.embedContent({
    model: "gemini-embedding-001",
    contents: question,
    config: {
      outputDimensionality: 768,
    },
  });

  // This is the embedding we will save later
  const embedding = response.embeddings[0].values;


  const result = await db.query(
    `
    SELECT
      q.id,
      q.question,
      1 - (q.embedding <=> $1::vector) AS similarity
    FROM questions q
    JOIN interviews i
      ON q.interview_id = i.id
    WHERE q.embedding IS NOT NULL
      AND i.role = $2
      AND i.difficulty = $3
    ORDER BY q.embedding <=> $1::vector
    LIMIT 1;
    `,
    [
      JSON.stringify(embedding),
      role,
      difficulty,
    ]
  );


  if (result.rows.length === 0) {
    return {
      similar: false,
      similarity: 0,
      matchedQuestion: null,
      embedding,
    };
  }


  const similarity = Number(
    result.rows[0].similarity
  );


  return {
    similar: similarity >= threshold,
    similarity,
    matchedQuestion: result.rows[0].question,
    embedding,
  };
};