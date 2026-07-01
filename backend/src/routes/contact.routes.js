import express from "express";
import * as ContactController from "../controllers/contact.controller.js";

const router = express.Router();

// Create Contact Message
router.post(
    "/",
    ContactController.createContact
);

// Get All Contact Messages
router.get(
    "/",
    ContactController.getAllContacts
);

// Get Contact By ID
router.get(
    "/:id",
    ContactController.getContactById
);

// Delete Contact Message
router.delete(
    "/:id",
    ContactController.deleteContact
);

export default router;