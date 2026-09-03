import {
    useEffect,
    useRef,
    useState
} from "react";

import {
    useParams,
    useNavigate
} from "react-router-dom";

import Navbar from "../components/Navbar/Navbar";

import interviewService
    from "../services/interviewService";

import "../components/InterviewQuestions/InterviewQuestions.css";

import useAuth
    from "../hooks/useAuth";

import useSpeechRecognition
    from "../hooks/useSpeechRecognition";

import useSpeechSynthesis
    from "../hooks/useSpeechSynthesis";


function InterviewQuestions() {

    const { id } = useParams();

    const navigate = useNavigate();

    const {
        isAuthenticated
    } = useAuth();


    // ==================================================
    // STATE
    // ==================================================

    const [questions, setQuestions] =
        useState([]);

    const [currentQuestion, setCurrentQuestion] =
        useState(0);

    const [answer, setAnswer] =
        useState("");

    const [loading, setLoading] =
        useState(true);

    const [evaluating, setEvaluating] =
        useState(false);

    const [introFinished, setIntroFinished] =
        useState(false);

    /*
     * Controls the UI state.
     *
     * intro
     * question
     * listening
     * response
     * thinking
     * none
     */
    const [speechMode, setSpeechMode] =
        useState("none");


    /*
     * IMPORTANT:
     *
     * This state tells React whether the interviewer
     * reaction is currently being spoken.
     *
     * When it changes from true -> false,
     * the question effect runs again.
     */
    const [isReactionSpeaking, setIsReactionSpeaking] =
        useState(false);


    // ==================================================
    // REFS
    // ==================================================

    /*
     * Prevent duplicate answer submissions.
     */
    const submittingRef =
        useRef(false);


    /*
     * Prevent introduction from playing twice.
     */
    const introPlayedRef =
        useRef(false);


    /*
     * Prevent the same question from being started
     * more than once.
     */
    const questionStartedRef =
        useRef(null);


    // ==================================================
    // SPEECH RECOGNITION
    // ==================================================

    const {
        transcript,
        isListening,
        startListening,
        stopListening,
        setTranscript
    } = useSpeechRecognition();


    // ==================================================
    // SPEECH SYNTHESIS
    // ==================================================

    const {
        speak,
        stopSpeaking,
        isSpeaking
    } = useSpeechSynthesis();


    // ==================================================
    // FETCH QUESTIONS
    // ==================================================

    useEffect(() => {

        fetchQuestions();

    }, [id]);


    const fetchQuestions = async () => {

        try {

            const data =
                await interviewService.getQuestions(id);


            if (Array.isArray(data)) {

                setQuestions(data);

            } else {

                setQuestions([]);

            }

        } catch (err) {

            console.error(
                "Fetch questions error:",
                err
            );

        } finally {

            setLoading(false);

        }

    };


    // ==================================================
    // INTERVIEW INTRODUCTION
    // ==================================================

    useEffect(() => {

        if (
            questions.length === 0
        ) {
            return;
        }


        if (
            introPlayedRef.current
        ) {
            return;
        }


        introPlayedRef.current = true;


        stopListening();

        stopSpeaking();


        setSpeechMode("intro");


        const introduction = `
Hi, I'm Gemini, and I'll be conducting your technical interview today.

I'll be assessing your technical knowledge,
problem-solving ability, and how clearly you explain your reasoning.

This interview is adaptive, which means the difficulty
of the questions may change based on your answers.

Take your time, think carefully, and answer as clearly as you can.

When you're ready, let's begin.
`;


        speak(

            introduction,

            () => {

                console.log(
                    "Introduction finished"
                );


                setSpeechMode("none");

                setIntroFinished(true);

            }

        );


    }, [questions]);


    // ==================================================
    // SUBMIT CURRENT ANSWER
    // ==================================================

    const submitCurrentAnswer = async (
        spokenAnswer = ""
    ) => {

        // ------------------------------------------------
        // Prevent duplicate submission
        // ------------------------------------------------

        if (
            submittingRef.current
        ) {

            console.log(
                "Answer submission already in progress"
            );

            return;

        }


        // ------------------------------------------------
        // Get current question
        // ------------------------------------------------

        const question =
            questions[currentQuestion];


        if (!question) {

            console.error(
                "Current question not found"
            );

            return;

        }


        // ------------------------------------------------
        // Lock submission
        // ------------------------------------------------

        submittingRef.current = true;


        try {

            stopListening();

            stopSpeaking();


            setSpeechMode("thinking");


            // ------------------------------------------------
            // Get answer
            // ------------------------------------------------

            const finalAnswer =
                spokenAnswer?.trim();


            const answerToSubmit =
                finalAnswer ||
                answer.trim() ||
                "Not Answered";


            console.log(
                "Submitting answer for question:",
                question.id
            );


            // ==================================================
            // 1. SUBMIT ANSWER
            // ==================================================

            const result =
                await interviewService.submitAnswer(

                    question.id,

                    answerToSubmit

                );


            console.log(
                "Answer response:",
                result
            );


            // ==================================================
            // 2. FINAL QUESTION
            // ==================================================

            if (
                result?.interviewCompleted
            ) {

                setEvaluating(true);


                // ---------------------------------------------
                // Speak interviewer reaction
                // ---------------------------------------------

                if (
                    result?.interviewerResponse
                ) {

                    setIsReactionSpeaking(true);

                    setSpeechMode("response");


                    speak(

                        result.interviewerResponse,

                        () => {

                            console.log(
                                "Final interviewer response finished"
                            );


                            // ---------------------------------
                            // Speak closing
                            // ---------------------------------

                            if (
                                result?.closing
                            ) {

                                setSpeechMode(
                                    "response"
                                );


                                speak(

                                    result.closing,

                                    () => {

                                        console.log(
                                            "Interview closing finished"
                                        );


                                        setIsReactionSpeaking(
                                            false
                                        );

                                        setSpeechMode(
                                            "none"
                                        );


                                        navigate(
                                            `/interview/${id}/result`
                                        );

                                    }

                                );

                            } else {

                                setIsReactionSpeaking(
                                    false
                                );

                                setSpeechMode(
                                    "none"
                                );


                                navigate(
                                    `/interview/${id}/result`
                                );

                            }

                        }

                    );

                } else if (
                    result?.closing
                ) {

                    setIsReactionSpeaking(true);

                    setSpeechMode("response");


                    speak(

                        result.closing,

                        () => {

                            console.log(
                                "Interview closing finished"
                            );


                            setIsReactionSpeaking(
                                false
                            );

                            setSpeechMode(
                                "none"
                            );


                            navigate(
                                `/interview/${id}/result`
                            );

                        }

                    );

                } else {

                    navigate(
                        `/interview/${id}/result`
                    );

                }


                return;

            }


            // ==================================================
            // 3. START INTERVIEWER RESPONSE
            // ==================================================

            if (
                result?.interviewerResponse
            ) {

                console.log(
                    "Speaking interviewer response..."
                );


                setIsReactionSpeaking(true);

                setSpeechMode("response");


                speak(

                    result.interviewerResponse,

                    () => {

                        console.log(
                            "Interviewer response finished"
                        );


                        /*
                         * This is the important part.
                         *
                         * React state changes from true
                         * to false.
                         *
                         * Because isReactionSpeaking is
                         * in the question effect dependencies,
                         * the question effect will run again.
                         */

                        setIsReactionSpeaking(false);

                        setSpeechMode("none");

                    }

                );

            }


            // ==================================================
            // 4. GENERATE NEXT QUESTION
            // ==================================================

            console.log(
                "Requesting next question..."
            );


            const nextResult =
                await interviewService.generateNextQuestion(

                    question.id

                );


            console.log(
                "Next question response:",
                nextResult
            );


            // ==================================================
            // 5. ADD NEXT QUESTION
            // ==================================================

            if (
                nextResult?.nextQuestion
            ) {

                const nextQuestion =
                    nextResult.nextQuestion;


                console.log(
                    "Adding next question:",
                    nextQuestion.id
                );


                setQuestions(
                    prev => [

                        ...prev,

                        nextQuestion

                    ]
                );


                // Clear previous answer
                setAnswer("");

                setTranscript("");


                // Move to next question
                setCurrentQuestion(
                    prev => prev + 1
                );


                return;

            }


            // ==================================================
            // 6. GENERATION FAILED
            // ==================================================

            console.error(
                "No next question returned:",
                nextResult
            );


            setSpeechMode("none");

            setIsReactionSpeaking(false);


        } catch (err) {

            console.error(
                "Submit answer error:",
                err
            );


            setSpeechMode("none");

            setIsReactionSpeaking(false);

        } finally {

            submittingRef.current = false;

        }

    };


    // ==================================================
    // UPDATE ANSWER FROM SPEECH
    // ==================================================

    useEffect(() => {

        if (transcript) {

            setAnswer(
                transcript
            );

        }

    }, [transcript]);


    // ==================================================
    // SPEAK CURRENT QUESTION
    // ==================================================

    useEffect(() => {

        // ------------------------------------------------
        // No questions
        // ------------------------------------------------

        if (
            questions.length === 0
        ) {

            return;

        }


        // ------------------------------------------------
        // Wait for introduction
        // ------------------------------------------------

        if (
            !introFinished
        ) {

            return;

        }


        // ------------------------------------------------
        // IMPORTANT
        //
        // Don't speak question while interviewer
        // response is still playing.
        // ------------------------------------------------

        if (
            isReactionSpeaking
        ) {

            console.log(
                "Interviewer response is still speaking..."
            );

            return;

        }


        // ------------------------------------------------
        // Get current question
        // ------------------------------------------------

        const question =
            questions[currentQuestion];


        if (!question) {

            return;

        }


        // ==================================================
        // PREVENT DUPLICATE QUESTION
        // ==================================================

        if (
            questionStartedRef.current ===
            question.id
        ) {

            console.log(
                "Question already started:",
                question.id
            );

            return;

        }


        // Mark question as started
        questionStartedRef.current =
            question.id;


        console.log(
            "Starting question:",
            question.id
        );


        stopListening();

        stopSpeaking();


        setSpeechMode("question");


        // ==================================================
        // SPEAK QUESTION
        // ==================================================

        const timer =
            setTimeout(() => {

                // Verify question is still current
                const current =
                    questions[currentQuestion];


                if (
                    !current ||
                    current.id !== question.id
                ) {

                    return;

                }


                console.log(
                    "Speaking question:",
                    question.id
                );


                speak(

                    question.question,

                    () => {

                        console.log(
                            "Question finished:",
                            question.id
                        );


                        // ----------------------------------
                        // Show listening state
                        // ----------------------------------

                        setSpeechMode(
                            "listening"
                        );


                        if (
                            !submittingRef.current
                        ) {

                            startListening(
                                submitCurrentAnswer
                            );

                        }

                    }

                );

            }, 300);


        // ==================================================
        // CLEANUP
        // ==================================================

        return () => {

            clearTimeout(timer);

        };


    }, [
        questions,
        currentQuestion,
        introFinished,
        isReactionSpeaking
    ]);


    // ==================================================
    // CLEANUP ON UNMOUNT
    // ==================================================

    useEffect(() => {

        return () => {

            stopSpeaking();

            stopListening();

        };

    }, []);


    // ==================================================
    // LOADING
    // ==================================================

    if (loading) {

        return (

            <>

                <Navbar />

                <div className="loading">

                    <h2>
                        Loading...
                    </h2>

                </div>

            </>

        );

    }


    // ==================================================
    // EVALUATING
    // ==================================================

    if (evaluating) {

    return (

        <>

            <Navbar />

            <div className="question-container">

                <div className="interview-room">

                    {/* =====================================
                        GEMINI FINAL RESPONSE
                    ===================================== */}

                    <div className="gemini-card">

                        <div className="gemini-avatar">
                            🤖
                        </div>

                        <h2>
                            Gemini
                        </h2>

                        <div className="gemini-response">

                            <p>
                                Great work! That concludes
                                your technical interview.
                            </p>

                        </div>

                        <div className="gemini-status">

                            <p>
                                🔊 Gemini is speaking...
                            </p>

                        </div>


                        {/* Speaking animation */}

                        <div className="speaking-animation">

                            <span></span>

                            <span></span>

                            <span></span>

                        </div>

                    </div>


                    {/* =====================================
                        EMPTY QUESTION PANEL
                    ===================================== */}

                    <div className="question-card">

                        <div className="question-empty">

                            <h2>
                                Interview Complete
                            </h2>

                            <p>
                                Gemini is finishing the interview.
                            </p>

                        </div>

                    </div>

                </div>

            </div>

        </>

    );

}


    // ==================================================
    // AUTHENTICATION
    // ==================================================

    if (!isAuthenticated) {

        return (

            <>

                <Navbar />

                <div className="plogin">

                    <h2>
                        Please Login
                    </h2>

                </div>

            </>

        );

    }


    // ==================================================
    // NO QUESTIONS
    // ==================================================

    if (
        questions.length === 0
    ) {

        return (

            <>

                <Navbar />

                <div className="loading">

                    <h2>
                        No questions found.
                    </h2>

                </div>

            </>

        );

    }


    // ==================================================
    // CURRENT QUESTION
    // ==================================================

    const question =
        questions[currentQuestion];


    // ==================================================
    // QUESTION VISIBILITY
    // ==================================================

    const showQuestion =
        speechMode === "question" ||
        speechMode === "listening";


    // ==================================================
    // UI
    // ==================================================

    return (

        <>

            <Navbar />


            <div className="question-container">


                <div className="interview-room">


                    {/* =====================================
                        GEMINI PANEL
                    ===================================== */}

                    <div className="gemini-card">


                        <div className="gemini-avatar">
                            🤖
                        </div>


                        <h2>
                            Gemini
                        </h2>


                        <div className="gemini-response">


                            {speechMode === "intro" && (

                                <p>
                                    Welcome! Let's begin
                                    your technical interview.
                                </p>

                            )}


                            {speechMode === "question" && (

                                <p>
                                    Please listen to the
                                    question carefully.
                                </p>

                            )}


                            {speechMode === "listening" && (

                                <p>
                                    Take your time and
                                    explain your answer.
                                </p>

                            )}


                            {speechMode === "response" && (

                                <p>
                                    Thank you for your response.
                                </p>

                            )}


                            {speechMode === "thinking" && (

                                <p>
                                    Gemini is preparing
                                    the next question...
                                </p>

                            )}

                        </div>


                        <div className="gemini-status">


                            {speechMode === "intro" && (

                                <p>
                                    🔊 Introducing the interview...
                                </p>

                            )}


                            {speechMode === "question" && (

                                <p>
                                    🔊 Asking question...
                                </p>

                            )}


                            {speechMode === "listening" && (

                                <div className="listening-indicator">

                                    <span className="listening-dot">
                                    </span>

                                    🎤 Listening to you...

                                </div>

                            )}


                            {speechMode === "response" && (

                                <p>
                                    🔊 Gemini is responding...
                                </p>

                            )}


                            {speechMode === "thinking" && (

                                <p className="processing-text">

                                    🧠 Preparing the next question...

                                </p>

                            )}

                        </div>


                        {(speechMode === "intro" ||
                            speechMode === "question" ||
                            speechMode === "response") && (

                            <div className="speaking-animation">

                                <span></span>

                                <span></span>

                                <span></span>

                            </div>

                        )}

                    </div>


                    {/* =====================================
                        QUESTION PANEL
                    ===================================== */}

                    <div className="question-card">


                        {showQuestion ? (

                            <>

                                <div className="question-header">


                                    <span className="question-number">
                                       Question{" "}
                                       {currentQuestion + 1}
                                       {" "}of{" "}
                                       {questions.length}
                                    </span>


                                    <span className="difficulty-badge">

                                        {
                                            question?.difficulty ||
                                            question?.question_difficulty ||
                                            "Medium"
                                        }

                                    </span>

                                </div>


                                <div className="question-text">

                                    {
                                        question?.question
                                    }

                                </div>


                                <div className="answer-section">


                                    <div className="answer-label">

                                        Your Answer

                                    </div>


                                    <textarea

                                        rows="6"

                                        placeholder="Speak your answer..."

                                        value={answer}

                                        onChange={(e) =>
                                            setAnswer(
                                                e.target.value
                                            )
                                        }

                                    />


                                    <div className="voice-status">


                                        {speechMode === "question" && (

                                            <p>
                                                🔊 Gemini is asking...
                                            </p>

                                        )}


                                        {speechMode === "listening" && (

                                            <div className="listening-indicator">

                                                <span className="listening-dot">
                                                </span>

                                                🎤 Listening...

                                            </div>

                                        )}

                                    </div>

                                </div>

                            </>

                        ) : (

                            <div className="question-empty">

                                <h2>
                                    Gemini is speaking
                                </h2>

                                <p>
                                    The next question will appear
                                    when Gemini starts asking it.
                                </p>

                            </div>

                        )}

                    </div>


                </div>

            </div>

        </>

    );

}


export default InterviewQuestions;