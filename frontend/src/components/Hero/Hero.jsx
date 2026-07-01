import "./Hero.css";
import FloatingCircle from "../FloatingCircle/FloatingCircle";
import {Link} from "react-router-dom";
import {useNavigate} from "react-router-dom";

function Hero() {
  const navigate = useNavigate();
  return (
    <section className="hero">

      <div className="left">

        <h1>
          Master <span>AI</span><br />
          Interviews
        </h1>

        <p>
          Practice coding, HR and technical interviews with an AI interviewer.
          Get instant feedback and improve your confidence.
        </p>

        <button className="start" onClick={() => navigate("/dashboard")}>
          Dashboard
        </button>

      </div>

      <div className="right">
        <FloatingCircle />
      </div>

    </section>
  );
}

export default Hero;