import api from "./api";

const contactService = {

    // Send Contact Message
    createContact: async (contactData) => {

        const response = await api.post(
            "/contact",
            contactData
        );

        return response.data;

    },

    // Get All Contact Messages
    getAllContacts: async () => {

        const response = await api.get(
            "/contact"
        );

        return response.data;

    },

    // Get Contact By ID
    getContactById: async (id) => {

        const response = await api.get(
            `/contact/${id}`
        );

        return response.data;

    },

    // Delete Contact
    deleteContact: async (id) => {

        const response = await api.delete(
            `/contact/${id}`
        );

        return response.data;

    }

};

export default contactService;