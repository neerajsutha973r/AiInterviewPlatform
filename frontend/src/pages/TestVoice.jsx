import useSpeechRecognition from "../hooks/useSpeechRecognition";
import useSpeechSynthesis from "../hooks/useSpeechSynthesis";

function TestVoice() {

    const {
        transcript,
        isListening,
        startListening,
        stopListening,
    } = useSpeechRecognition();

    const {
        speak,
        stopSpeaking,
        isSpeaking,
    } = useSpeechSynthesis();

    return (

        <div>

            <h1>Voice Test</h1>

            <button onClick={startListening}>
                Start Mic
            </button>

            <button onClick={stopListening}>
                Stop Mic
            </button>

            <br /><br />

            <button
                onClick={() =>
                    speak("Tell me about yourself.")
                }
            >
                Read Question
            </button>

            <button onClick={stopSpeaking}>
                Stop Reading
            </button>

            <h2>
                {isListening
                    ? "🎤 Listening..."
                    : "🎤 Stopped"}
            </h2>

            <h2>
                {isSpeaking
                    ? "🔊 Speaking..."
                    : "🔇 Silent"}
            </h2>

            <p>{transcript}</p>

        </div>

    );

}

export default TestVoice;