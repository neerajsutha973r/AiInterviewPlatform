import { useState } from "react";

function useSpeechSynthesis() {

    const [isSpeaking, setIsSpeaking] = useState(false);

    const speak = (text, onFinished = null) => {

        if (!text) return;

        // Stop any previous speech
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);

        const voices = window.speechSynthesis.getVoices();

        utterance.voice =
            voices.find(
                voice => voice.name === "Google UK English Female"
            ) ||
            voices.find(
                voice => voice.name === "Microsoft Zira - English (United States)"
            ) ||
            voices.find(
                voice => voice.name === "Microsoft Heera - English (India)"
            ) ||
            voices[0];

        utterance.lang = "en-US";
        utterance.rate = 0.9;
        utterance.pitch = 0.9;
        utterance.volume = 1;

        utterance.onstart = () => {

            setIsSpeaking(true);

        };

        utterance.onend = () => {

            setIsSpeaking(false);

            if (onFinished) {
                onFinished();
            }

        };

        utterance.onerror = () => {

            setIsSpeaking(false);

        };

        // Play speech
        window.speechSynthesis.speak(utterance);

    };

    const stopSpeaking = () => {

        window.speechSynthesis.cancel();

        setIsSpeaking(false);

    };

    return {

        speak,
        stopSpeaking,
        isSpeaking,

    };

}

export default useSpeechSynthesis;