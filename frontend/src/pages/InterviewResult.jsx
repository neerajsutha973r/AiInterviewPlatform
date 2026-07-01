import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Navbar from "../components/Navbar/Navbar";
import interviewService from "../services/interviewService";
import "../components/InterviewResult/InterviewResult.css";
import useAuth from "../hooks/useAuth";

function InterviewResult() {

  const { id } = useParams();

  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [marks,setMarks]=useState(0);
  const {isAuthenticated,logout}=useAuth();

  useEffect(() => {
    fetchResults();
  }, []);

  const fetchResults = async () => {

    try {

      const data =
        await interviewService.getInterviewAnswers(id);
        
      setAnswers(data.results);
      setMarks(data.marks);

    } catch (err) {

      console.log(err);

    } finally {

      setLoading(false);

    }

  };

  if (loading) {
    return <h2>Loading Results...</h2>;
  }
  if(!isAuthenticated){
    return (<>
    <Navbar/>
    <h2 className="plogin">Please login</h2>
    </>);
  }

  return (
    < >
      <Navbar />

      <div className="result-container">

        <h1>Interview Result</h1>

        {answers.map((item, index) => (

          <div
            key={item.question_id}
            className="result-card"
          >

            <h2>
              Question {index + 1}
            </h2>

            <p>
              <strong>Question:</strong>
            </p>

            <p>{item.question}</p>

            <p>
              <strong>Your Answer:</strong>
            </p>

            <p>{item.answer || "Not Answered"}</p>

            <p>
              <strong>Score:</strong>
            </p>

            <p>{item.score}/10</p>


            <p>
              <strong>Feedback:</strong>
            </p>

            <p>{item.feedback}</p>

            <p>
              <strong>correct_answer:</strong>
            </p>

            <p>{item.correct_answer}</p>



          </div>

        ))}
        <div className="total-marks">
        <strong>your total marks is:</strong>
          <p>{marks}/100 </p>
          </div>
</div>
      
    </>
  );
}

export default InterviewResult;