import {
    useState,
    useRef,
    useEffect
} from "react";


function useSpeechRecognition() {

    const [
        transcript,
        setTranscript
    ] = useState("");


    const [
        isListening,
        setIsListening
    ] = useState(false);


    // ==================================================
    // REFS
    // ==================================================

    const recognitionRef =
        useRef(null);


    const silenceTimer =
        useRef(null);


    const callbackRef =
        useRef(null);


    // Stores the complete answer
    const finalTranscriptRef =
        useRef("");


    // Prevent callback from firing more than once
    const callbackCalledRef =
        useRef(false);


    const manuallyStoppedRef =
        useRef(false);


    // ==================================================
    // BROWSER SPEECH RECOGNITION
    // ==================================================

    const SpeechRecognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition;


    // ==================================================
    // INITIALIZE
    // ==================================================

    useEffect(() => {

        if (!SpeechRecognition) {

            console.error(
                "Speech Recognition is not supported by this browser."
            );

            return;

        }


        const recognition =
            new SpeechRecognition();


        recognition.lang =
            "en-US";


        /*
         * Keep listening during the candidate's answer.
         */
        recognition.continuous =
            true;


        /*
         * We need interim results so the UI updates
         * while the candidate is speaking.
         */
        recognition.interimResults =
            true;


        // ==================================================
        // ON START
        // ==================================================

        recognition.onstart = () => {

            console.log(
                "🎤 Speech recognition started"
            );


            setIsListening(true);


            manuallyStoppedRef.current =
                false;


            callbackCalledRef.current =
                false;


            // If candidate hasn't spoken anything
            // for 5 seconds, stop.
            clearTimeout(
                silenceTimer.current
            );


            silenceTimer.current =
                setTimeout(() => {

                    console.log(
                        "⏳ Initial silence timeout"
                    );


                    recognition.stop();

                }, 5000);

        };


        // ==================================================
        // ON RESULT
        // ==================================================

        recognition.onresult = (
            event
        ) => {

            /*
             * IMPORTANT:
             *
             * We accumulate results instead of replacing
             * the previous transcript.
             */

            let sessionText = "";


            for (
                let i = 0;
                i < event.results.length;
                i++
            ) {

                const result =
                    event.results[i];


                if (
                    result &&
                    result[0]
                ) {

                    sessionText +=
                        result[0].transcript;

                }

            }


            sessionText =
                sessionText.trim();


            // ----------------------------------------------
            // Store complete answer
            // ----------------------------------------------

            finalTranscriptRef.current =
                sessionText;


            // ----------------------------------------------
            // Update UI
            // ----------------------------------------------

            setTranscript(
                sessionText
            );


            console.log(
                "📝 Current transcript:",
                sessionText
            );


            // ----------------------------------------------
            // Reset silence timer
            // ----------------------------------------------

            clearTimeout(
                silenceTimer.current
            );


            silenceTimer.current =
                setTimeout(() => {

                    console.log(
                        "⏳ Candidate stopped speaking"
                    );


                    recognition.stop();

                }, 3000);

        };


        // ==================================================
        // ON END
        // ==================================================

        recognition.onend = () => {

            console.log(
                "🛑 Speech recognition ended"
            );


            setIsListening(false);


            clearTimeout(
                silenceTimer.current
            );


            /*
             * Don't call the callback more than once.
             */
            if (
                callbackCalledRef.current
            ) {

                return;

            }


            callbackCalledRef.current =
                true;


            /*
             * IMPORTANT:
             *
             * Give the final transcript to the component.
             */

            if (
                callbackRef.current
            ) {

                const finalAnswer =
                    finalTranscriptRef.current
                        .trim();


                console.log(
                    "✅ Final candidate answer:",
                    finalAnswer
                );


                callbackRef.current(
                    finalAnswer
                );

            }

        };


        // ==================================================
        // ON ERROR
        // ==================================================

        recognition.onerror = (
            event
        ) => {

            console.error(
                "Speech recognition error:",
                event.error
            );


            setIsListening(false);


            clearTimeout(
                silenceTimer.current
            );


            /*
             * Don't submit on common browser errors
             * such as aborted/no-speech.
             */

            if (
                event.error ===
                    "aborted" ||
                event.error ===
                    "no-speech"
            ) {

                return;

            }

        };


        // ==================================================
        // SAVE INSTANCE
        // ==================================================

        recognitionRef.current =
            recognition;


        // ==================================================
        // CLEANUP
        // ==================================================

        return () => {

            clearTimeout(
                silenceTimer.current
            );


            if (
                recognitionRef.current
            ) {

                try {

                    recognitionRef.current.stop();

                } catch (error) {

                    console.log(
                        "Recognition cleanup:",
                        error
                    );

                }

            }

        };

    }, []);


    // ==================================================
    // START LISTENING
    // ==================================================

    const startListening = (
        onFinished = null
    ) => {

        if (
            !recognitionRef.current
        ) {

            console.error(
                "Speech recognition is unavailable."
            );

            return;

        }


        /*
         * Save callback for this answer.
         */

        callbackRef.current =
            onFinished;


        /*
         * Reset everything ONLY when a completely
         * new answer starts.
         */

        finalTranscriptRef.current =
            "";

        callbackCalledRef.current =
            false;

        manuallyStoppedRef.current =
            false;


        setTranscript(
            ""
        );


        clearTimeout(
            silenceTimer.current
        );


        try {

            recognitionRef.current.start();

            console.log(
                "🎤 Starting new answer recording"
            );

        } catch (error) {

            /*
             * Browser can throw if start() is called
             * while recognition is already running.
             */

            console.log(
                "Speech recognition start:",
                error
            );

        }

    };


    // ==================================================
    // STOP LISTENING
    // ==================================================

    const stopListening = () => {

        if (
            !recognitionRef.current
        ) {

            return;

        }


        clearTimeout(
            silenceTimer.current
        );


        /*
         * IMPORTANT:
         *
         * Clear callback before manually stopping.
         *
         * This prevents stopListening() from accidentally
         * submitting an answer a second time.
         */

        callbackRef.current =
            null;


        callbackCalledRef.current =
            true;


        manuallyStoppedRef.current =
            true;


        try {

            recognitionRef.current.stop();

        } catch (error) {

            console.log(
                "Speech recognition stop:",
                error
            );

        }


        setIsListening(
            false
        );

    };


    // ==================================================
    // RETURN
    // ==================================================

    return {

        transcript,

        setTranscript,

        isListening,

        startListening,

        stopListening,

    };

}


export default useSpeechRecognition;