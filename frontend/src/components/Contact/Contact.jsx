
import "./Contact.css";
import { useState } from "react";
import contactService from "../../services/contactService";

function Contact() {

    const[formData,setFormData]=useState({
       name:"",
       email:"",
       subject:"",
       message:""
    });
    const [loading,setLoading]=useState(false);
    const [error,setError]=useState("");
    const handleChange=(e)=>{
        setFormData((prev)=>({
            ...prev,
            [e.target.name]:e.target.value,
        }));
        setError("");
    };

    const handleSubmit=async(e)=>{
        e.preventDefault();
        if(!formData.name || !formData.email || !formData.subject || !formData.message){
            setError("Please fill all fields.");
            return;
        }
        try{
            setLoading(true);

            await contactService.createContact({
                name:formData.name,
                email:formData.email,
                subject:formData.subject,
                message:formData.message
            });
        } catch(err){
            setError(err.response?.data?.message || "contact failed");
        }
        finally{
            setLoading(false);
        }
    }
    

    return (

        <>

            <div className="contact-page">

                <div className="contact-container">

                    <div className="contact-info">

                        <h1>Contact Us</h1>

                        <p>
                            We'd love to hear from you! Whether you have a
                            question, feedback, or a feature request, feel free
                            to reach out.
                        </p>

                        <div className="info-box">
                            <h3>📧 Email</h3>
                            <p>neerajsuthar227@gmail.com</p>
                        </div>

                        <div className="info-box">
                            <h3>📞 Phone</h3>
                            <p>+91 8005710341</p>
                        </div>

                        <div className="info-box">
                            <h3>📍 Address</h3>
                            <p>Jaipur, Rajasthan, India</p>
                        </div>

                    </div>

                    <div className="contact-form">

                        <h2>Send a Message</h2>

                        <form onSubmit={handleSubmit}>

                            <input
                                type="text"
                                placeholder="Your Name"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                            />

                            <input
                                type="email"
                                placeholder="Your Email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                            />

                            <input
                                type="text"
                                placeholder="Subject"
                                name="subject"
                                value={formData.subject}
                                onChange={handleChange}
                            />

                            <textarea
                                rows="6"
                                placeholder="Write your message..."
                                name="message"
                                value={formData.message}
                                onChange={handleChange}
                            ></textarea>
                            
                           {error && <p className="error">{error}</p>}

                            <button type="submit" disabled={loading}>
                               {loading?"Sending Message...":"Send Message"}
                            </button>

                        </form>

                    </div>

                </div>

            </div>

        </>

    );

}

export default Contact;