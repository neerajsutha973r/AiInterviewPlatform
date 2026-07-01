import { useState, useRef, useEffect } from "react";

function useSpeechRecognition() {

    const [transcript, setTranscript] = useState("");
    const [isListening, setIsListening] = useState(false);

    const recognitionRef = useRef(null);
    const silenceTimer = useRef(null);
    const callbackRef = useRef(null);
    const latestTranscript = useRef("");

    const SpeechRecognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition;

    useEffect(() => {

        if (!SpeechRecognition) return;

        const recognition = new SpeechRecognition();

        recognition.lang = "en-US";

        recognition.continuous = true;

        recognition.interimResults = true;

        recognition.onstart = () => {

            setIsListening(true);

            silenceTimer.current = setTimeout(() => {
                recognition.stop();
            }, 5000);

        };

        recognition.onresult = (event) => {

            let text = "";

            for (
                let i = event.resultIndex;
                i < event.results.length;
                i++
            ) {

                text += event.results[i][0].transcript;

            }

            latestTranscript.current = text;

            setTranscript(text);

            clearTimeout(silenceTimer.current);

            silenceTimer.current = setTimeout(() => {

                recognition.stop();

            }, 3000);

        };

        recognition.onend = () => {

            setIsListening(false);

            if (callbackRef.current) {

                callbackRef.current(
                    latestTranscript.current
                );

            }

        };

        recognition.onerror = (event) => {

            console.log(event.error);

            setIsListening(false);

        };

        recognitionRef.current = recognition;

        return () => {

            recognition.stop();

            clearTimeout(silenceTimer.current);

        };

    }, []);

    const startListening = (onFinished = null) => {

        if (!recognitionRef.current) return;

        callbackRef.current = onFinished;

        latestTranscript.current = "";

        setTranscript("");

        recognitionRef.current.start();

    };

    const stopListening = () => {

        if (!recognitionRef.current) return;

        clearTimeout(silenceTimer.current);

        recognitionRef.current.stop();

    };

    return {

        transcript,

        setTranscript,

        isListening,

        startListening,

        stopListening,

    };

}

export default useSpeechRecognition;