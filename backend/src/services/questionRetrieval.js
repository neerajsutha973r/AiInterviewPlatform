import { GoogleGenAI } from "@google/genai";
import db from "../db/connection.js";


const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});


// ======================================================
// GENERATE QUESTION EMBEDDING
// ======================================================

const generateEmbedding = async (
  question
) => {

  const response =
    await ai.models.embedContent({

      model:
        "gemini-embedding-001",

      contents:
        question,

      config: {
        outputDimensionality: 768,
      },

    });


  if (
    !response.embeddings ||
    !response.embeddings[0] ||
    !response.embeddings[0].values
  ) {

    throw new Error(
      "Failed to generate question embedding"
    );

  }


  const embedding =
    response.embeddings[0].values;


  if (
    embedding.length !== 768
  ) {

    throw new Error(
      `Invalid embedding dimension: ${embedding.length}. Expected 768.`
    );

  }


  return embedding;

};


// ======================================================
// FIND SIMILAR QUESTIONS
// ======================================================
//
// Finds previous questions for:
//   - Same user
//   - Same role
//
// Difficulty is intentionally NOT filtered.
//
// ======================================================

export const findSimilarQuestions = async (
  newQuestion,
  userId,
  role,
  limit = 10
) => {


  const embedding =
    await generateEmbedding(
      newQuestion
    );


  const result =
    await db.query(
      `
      SELECT
        q.id,
        q.question,
        i.role,

        1 - (
          q.embedding <=> $1::vector
        ) AS similarity

      FROM questions q

      JOIN interviews i
        ON q.interview_id = i.id

      WHERE q.embedding IS NOT NULL

        AND i.user_id = $2

        AND i.role = $3

      ORDER BY
        q.embedding <=> $1::vector

      LIMIT $4;
      `,
      [
        JSON.stringify(embedding),

        userId,

        role,

        limit,
      ]
    );


  return result.rows;

};


// ======================================================
// CHECK QUESTION SIMILARITY
// ======================================================
//
// Returns the closest previous question.
//
// If similarity >= threshold,
// the generated question is rejected.
//
// ======================================================

export const isSimilarToExistingQuestion =
  async (
    question,
    userId,
    role,
    threshold = 0.85
  ) => {


    const embedding =
      await generateEmbedding(
        question
      );


    const result =
      await db.query(
        `
        SELECT
          q.id,
          q.question,

          1 - (
            q.embedding <=> $1::vector
          ) AS similarity

        FROM questions q

        JOIN interviews i
          ON q.interview_id = i.id

        WHERE q.embedding IS NOT NULL

          AND i.user_id = $2

          AND i.role = $3

        ORDER BY
          q.embedding <=> $1::vector

        LIMIT 1;
        `,
        [
          JSON.stringify(embedding),

          userId,

          role,
        ]
      );


    // --------------------------------------------------
    // No previous questions
    // --------------------------------------------------

    if (
      result.rows.length === 0
    ) {

      return {

        similar:
          false,

        similarity:
          0,

        matchedQuestion:
          null,

        embedding,

      };

    }


    // --------------------------------------------------
    // Get closest similarity
    // --------------------------------------------------

    const similarity =
      Number(
        result.rows[0].similarity
      );


    return {

      similar:
        similarity >= threshold,

      similarity,

      matchedQuestion:
        result.rows[0].question,

      embedding,

    };

  };