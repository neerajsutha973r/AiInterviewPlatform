import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import Navbar from "../components/Navbar/Navbar";

import interviewService
  from "../services/interviewService";

import "../components/InterviewResult/InterviewResult.css";

import useAuth from "../hooks/useAuth";


function InterviewResult() {

  const { id } = useParams();

  const [answers, setAnswers] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [marks, setMarks] =
    useState(0);

  const {
    isAuthenticated
  } = useAuth();


  // ==================================================
  // FETCH RESULTS
  // ==================================================

  useEffect(() => {

    fetchResults();

  }, [id]);


  const fetchResults = async () => {

    try {

      const data =
        await interviewService
          .getInterviewAnswers(id);


      // Backend currently returns an array
      const resultAnswers =
        Array.isArray(data)
          ? data
          : [];


      setAnswers(
        resultAnswers
      );


      // Calculate total score
      const total =
        resultAnswers.reduce(
          (
            sum,
            item
          ) => {

            return (
              sum +
              (Number(item.score) || 0)
            );

          },
          0
        );


      setMarks(total);

    } catch (err) {

      console.error(
        "Fetch results error:",
        err
      );

      setAnswers([]);

      setMarks(0);

    } finally {

      setLoading(false);

    }

  };


  // ==================================================
  // LOADING
  // ==================================================

  if (loading) {

    return (

      <>

        <Navbar />

        <h2>
          Loading Results...
        </h2>

      </>

    );

  }


  // ==================================================
  // AUTH
  // ==================================================

  if (!isAuthenticated) {

    return (

      <>

        <Navbar />

        <h2 className="plogin">
          Please login
        </h2>

      </>

    );

  }


  // ==================================================
  // RESULT
  // ==================================================

  return (

    <>

      <Navbar />

      <div className="result-container">

        <h1>
          Interview Result
        </h1>


        {answers.length === 0 ? (

          <p>
            No answers found.
          </p>

        ) : (

          answers.map(
            (item, index) => (

              <div
                key={
                  item.question_id ||
                  index
                }
                className="result-card"
              >

                <h2>
                  Question {index + 1}
                </h2>


                <p>
                  <strong>
                    Question:
                  </strong>
                </p>

                <p>
                  {item.question}
                </p>


                <p>
                  <strong>
                    Your Answer:
                  </strong>
                </p>

                <p>
                  {
                    item.answer ||
                    "Not Answered"
                  }
                </p>


                <p>
                  <strong>
                    Score:
                  </strong>
                </p>

                <p>
                  {item.score ?? 0}/10
                </p>


                <p>
                  <strong>
                    Feedback:
                  </strong>
                </p>

                <p>
                  {
                    item.feedback ||
                    "No feedback available."
                  }
                </p>


                <p>
                  <strong>
                    Correct Answer:
                  </strong>
                </p>

                <p>
                  {item.correct_answer}
                </p>


                <p>
                  <strong>
                    Difficulty:
                  </strong>
                </p>

                <p>
                  {
                    item.question_difficulty ||
                    "N/A"
                  }
                </p>

              </div>

            )
          )

        )}


        <div className="total-marks">

          <strong>
            Your total marks:
          </strong>

          <p>
            {marks}/{answers.length * 10}
          </p>

        </div>

      </div>

    </>

  );

}


export default InterviewResult;