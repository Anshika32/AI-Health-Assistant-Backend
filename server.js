require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = "app8Rdff1iDQjyeNz";
const AIRTABLE_TABLE_NAME = "users";
const AIRTABLE_ENDPOINT = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}`;

const headers = {
    "Authorization": `Bearer ${AIRTABLE_API_KEY}`,
    "Content-Type": "application/json"
};

// Signup Route
app.post("/signup", async (req, res) => {
    try {
        console.log("Received signup request:", req.body);
        
        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ error: "Missing required fields." });
        }

        console.log("Checking if email exists:", email);
        const searchURL = `${AIRTABLE_ENDPOINT}?filterByFormula=({email}="${email}")`;
        const searchResponse = await axios.get(searchURL, { headers });

        if (searchResponse.data.records.length > 0) {
            return res.status(400).json({ error: "Email already registered." });
        }

        console.log("Creating new user...");
        const data = {
            fields: { name, email, password, signup_time: new Date().toISOString(), last_login: new Date().toISOString(), login_count: 1 }
        };

        const response = await axios.post(AIRTABLE_ENDPOINT, data, { headers });
        console.log("User created successfully:", response.data);
        res.json(response.data);
    } catch (error) {
        console.error("Signup error:", error.response ? error.response.data : error.message);
        res.status(500).json({ error: error.message });
    }
});

// Login Route
app.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        const searchURL = `${AIRTABLE_ENDPOINT}?filterByFormula=({email}="${email}")`;

        const response = await axios.get(searchURL, { headers });
        if (response.data.records.length === 0) {
            return res.status(401).json({ error: "User not found. Please sign up first." });
        }

        const user = response.data.records[0];
        const userId = user.id;
        const loginCount = user.fields.login_count + 1;

        // Validate password (For production, use bcrypt hashing)
        if (user.fields.password !== password) {
            return res.status(401).json({ error: "Incorrect password." });
        }

        // Update last login time and count
        const updateData = {
            fields: {
                last_login: new Date().toISOString(),
                login_count: loginCount
            }
        };

        await axios.patch(`${AIRTABLE_ENDPOINT}/${userId}`, updateData, { headers });

        res.json({ message: "Login successful!", user: user.fields });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


const GROQ_API_KEY = process.env.GROQ_API_KEY;


// API key route (only send it securely to frontend)
app.get("/get-api-key", (req, res) => {
    res.json({ apiKey: process.env.GROQ_API_KEY });
});



// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
