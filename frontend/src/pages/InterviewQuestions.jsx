import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar/Navbar";
import interviewService from "../services/interviewService";
import "../components/InterviewQuestions/InterviewQuestions.css";
import useAuth from "../hooks/useAuth";
import useSpeechRecognition from "../hooks/useSpeechRecognition";
import useSpeechSynthesis from "../hooks/useSpeechSynthesis";

function InterviewQuestions() {

    const { id } = useParams();
    const navigate = useNavigate();

    const { isAuthenticated } = useAuth();

    const [questions, setQuestions] = useState([]);
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [answer, setAnswer] = useState("");
    const [loading, setLoading] = useState(true);
    const [evaluating, setEvaluating] = useState(false);

    const {
        transcript,
        isListening,
        startListening,
        stopListening,
        setTranscript,
    } = useSpeechRecognition();

    const {
        speak,
        stopSpeaking,
        isSpeaking,
    } = useSpeechSynthesis();

    useEffect(() => {
        fetchQuestions();
    }, []);


  const submitCurrentAnswer = async (spokenAnswer="") => {

    try {

        stopListening();

        stopSpeaking();

        const finalAnswer = spokenAnswer.trim();

        await interviewService.submitAnswer(

            questions[currentQuestion].id,

            finalAnswer  || "Not Answered"

        );

        if (currentQuestion === questions.length - 1) {
            
            setEvaluating(true);

            await interviewService.evaluateInterview(id);

            navigate(`/interview/${id}/result`);

        }

        else {
            setAnswer("");
            setCurrentQuestion(prev => prev + 1);

        }

    }

    catch (err) {

        console.log(err);

    }

};

    const fetchQuestions = async () => {

        try {

            const data = await interviewService.getQuestions(id);

            setQuestions(data);

        } catch (err) {

            console.log(err);

        } finally {

            setLoading(false);

        }

    };

    // Fill textarea from speech
    useEffect(() => {
        console.log("trans:",transcript);
        if (transcript) {

            setAnswer(transcript);

        }

    }, [transcript]);

    // Read question then automatically start listening
    useEffect(() => {

        if (questions.length === 0) return;

        stopListening();

        speak(
    questions[currentQuestion].question,
    () => {

        startListening(submitCurrentAnswer);

    }
);

    }, [questions, currentQuestion]);

    // Cleanup
    useEffect(() => {

        return () => {

            stopSpeaking();
            stopListening();

        };

    }, []);

    if (loading) {
        return (
            <>
            <Navbar/>
            <div className="loading1"><h2>Loading...</h2></div>
            </>
        );

    }
    if(evaluating){
        return (
            <><h2>Please wait few seconds AI is evaluating your answers... </h2></>
        )
    }
    if (!isAuthenticated) {

        return (
            <>
                <Navbar />
                <div className="plogin">
                    <h2>Please Login</h2>
                </div>
            </>
        );

    }

    return (

        <>
            <Navbar />

            <div className="question-container">

                <div className="question-card">

                    <h2>
                        Question {currentQuestion + 1} of {questions.length}
                    </h2>

                    <h3>
                        {questions[currentQuestion]?.question}
                    </h3>

                    <textarea
                        rows="8"
                        placeholder="speak your answer..."
                        value={answer}
                        onChange={(e) => setAnswer(e.target.value)}
                    />

                    <div className="voice-status">

                        {isSpeaking && (
                            <p>🔊 AI is asking the question...</p>
                        )}

                        {!isSpeaking && isListening && (
                            <p>🎤 Listening...</p>
                        )}

                    </div>

                </div>

            </div>

        </>

    );

}

export default InterviewQuestions;