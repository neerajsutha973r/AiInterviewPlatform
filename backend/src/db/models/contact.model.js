import db from "../connection.js";

export const createContact = async (
    name,
    email,
    subject,
    message
) => {

    const result = await db.query(
        `
        INSERT INTO contacts
        (
            name,
            email,
            subject,
            message
        )
        VALUES
        (
            $1, $2, $3, $4
        )
        RETURNING *
        `,
        [
            name,
            email,
            subject,
            message
        ]
    );

    return result.rows[0];

};

export const getAllContacts = async () => {

    const result = await db.query(
        `
        SELECT *
        FROM contacts
        ORDER BY created_at DESC
        `
    );

    return result.rows;

};

export const getContactById = async (id) => {

    const result = await db.query(
        `
        SELECT *
        FROM contacts
        WHERE id = $1
        `,
        [id]
    );

    return result.rows[0];

};

export const deleteContact = async (id) => {

    const result = await db.query(
        `
        DELETE FROM contacts
        WHERE id = $1
        RETURNING *
        `,
        [id]
    );

    return result.rows[0];

};