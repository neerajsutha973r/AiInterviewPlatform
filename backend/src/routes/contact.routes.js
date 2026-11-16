import express from "express";
import * as ContactController from "../controllers/contact.controller.js";

const router = express.Router();

// Management stays disabled until explicit admin authorization is designed.
const denyContactManagement = (req, res) => {
    return res.status(403).json({ message: "Contact management is disabled" });
};

// Create Contact Message
router.post(
    "/",
    ContactController.createContact
);

// Get All Contact Messages
router.get(
    "/",
    denyContactManagement
);

// Get Contact By ID
router.get(
    "/:id",
    denyContactManagement
);

// Delete Contact Message
router.delete(
    "/:id",
    denyContactManagement
);

export default router;
