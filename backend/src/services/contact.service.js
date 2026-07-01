import * as ContactModel from "../db/models/contact.model.js";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

export const createContact = async (contactData) => {

    // Save message to database
    const contact = await ContactModel.createContact(
        contactData.name,
        contactData.email,
        contactData.subject,
        contactData.message
    );

    // Configure transporter
    const transporter = nodemailer.createTransport({

        service: "gmail",

        auth: {

            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,

        },

    });

    // Send email
    await transporter.sendMail({

        from: process.env.EMAIL_USER,

        to: process.env.EMAIL_USER,

        subject: `New Contact: ${contactData.subject}`,

        html: `
            <h2>New Contact Message</h2>

            <p><strong>Name:</strong> ${contactData.name}</p>

            <p><strong>Email:</strong> ${contactData.email}</p>

            <p><strong>Subject:</strong> ${contactData.subject}</p>

            <p><strong>Message:</strong></p>

            <p>${contactData.message}</p>
        `,

    });

    return contact;

};

export const getAllContacts = async () => {

    return await ContactModel.getAllContacts();

};

export const getContactById = async (id) => {

    return await ContactModel.getContactById(id);

};

export const deleteContact = async (id) => {

    return await ContactModel.deleteContact(id);

};