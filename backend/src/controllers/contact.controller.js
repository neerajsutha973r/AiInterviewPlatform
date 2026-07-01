import httpStatus from "http-status";
import * as ContactService from "../services/contact.service.js";

export const createContact = async (req, res) => {

    const { name, email, subject, message } = req.body;

    if (!name || !email || !subject || !message) {

        return res.status(httpStatus.BAD_REQUEST).json({
            message: "Please provide all fields",
        });

    }

    try {

        const contact = await ContactService.createContact({
            name,
            email,
            subject,
            message,
        });

        return res.status(httpStatus.CREATED).json({
            message: "Message sent successfully",
            data: contact,
        });

    } catch (err) {

        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            message: err.message,
        });

    }

};

export const getAllContacts = async (req, res) => {

    try {

        const contacts = await ContactService.getAllContacts();

        return res.status(httpStatus.OK).json(contacts);

    } catch (err) {

        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            message: err.message,
        });

    }

};

export const getContactById = async (req, res) => {

    try {

        const contact = await ContactService.getContactById(req.params.id);

        if (!contact) {

            return res.status(httpStatus.NOT_FOUND).json({
                message: "Contact not found",
            });

        }

        return res.status(httpStatus.OK).json(contact);

    } catch (err) {

        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            message: err.message,
        });

    }

};

export const deleteContact = async (req, res) => {

    try {

        const contact = await ContactService.deleteContact(req.params.id);

        if (!contact) {

            return res.status(httpStatus.NOT_FOUND).json({
                message: "Contact not found",
            });

        }

        return res.status(httpStatus.OK).json({
            message: "Contact deleted successfully",
        });

    } catch (err) {

        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            message: err.message,
        });

    }

};