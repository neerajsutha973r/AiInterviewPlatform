import "./About.css";

function About(){

    return (<>
    <section className="about-section">

    <div className="about-container">

        <h2>About AI Interview Platform</h2>

        <p>
            AI Interview Platform is a smart interview preparation application
            designed to help job seekers practice technical interviews in a
            realistic environment. The platform generates personalized interview
            questions based on your selected role and difficulty level using
            Artificial Intelligence.
        </p>

        <p>
            During the interview, users can answer questions through text or
            voice, creating an interactive interview experience. Once the
            interview is completed, AI evaluates every answer, provides detailed
            feedback, assigns a score, and highlights areas for improvement.
        </p>

        <p>
            Whether you are preparing for your first internship or an experienced
            software engineering interview, our platform helps you build
            confidence through continuous practice and instant AI-powered
            feedback.
        </p>

        <div className="about-features">

            <div className="feature-card">
                <h3>🤖 AI Question Generation</h3>
                <p>
                    Generate personalized interview questions based on role and
                    difficulty.
                </p>
            </div>

            <div className="feature-card">
                <h3>🎤 Voice Interview</h3>
                <p>
                    Practice interviews using speech recognition and voice-based
                    interaction.
                </p>
            </div>

            <div className="feature-card">
                <h3>📊 AI Evaluation</h3>
                <p>
                    Receive scores, detailed feedback, and suggestions after
                    completing your interview.
                </p>
            </div>

            <div className="feature-card">
                <h3>📈 Performance Tracking</h3>
                <p>
                    View interview history, completed interviews, and improve
                    over time.
                </p>
            </div>

        </div>

    </div>

</section>



    </>);
}
export default About;