// server.js
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const axios = require('axios');
require('dotenv').config();
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
const upload = multer({ dest: 'uploads/' });

// Authenticate with DocuWare
const authenticate = async () => {
    const response = await axios.post(`${process.env.DOCUWARE_SERVER}/DocuWare/Platform/Account/Logon`, {
        UserName: process.env.DOCUWARE_USERNAME,
        Password: process.env.DOCUWARE_PASSWORD,
        ClientId: process.env.DOCUWARE_CLIENT_ID,
    });
    return response.data.token;
};

// Upload Document Endpoint
app.post('/api/upload', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }

    try {
        const token = await authenticate();
        const fileBuffer = fs.readFileSync(req.file.path);
        const fileName = req.file.originalname;

        const uploadResponse = await axios.post(
            `${process.env.DOCUWARE_SERVER}/DocuWare/Platform/FileCabinets/${process.env.FILE_CABINET_ID}/Documents`,
            fileBuffer,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/pdf', // Change based on your file type
                    'Content-Disposition': `attachment; filename="${fileName}"`,
                }
            }
        );

        // Cleanup: Remove the uploaded file from the server
        fs.unlinkSync(req.file.path);

        res.status(200).json({
            message: 'File uploaded successfully',
            data: uploadResponse.data,
        });
    } catch (error) {
        console.error('Error uploading document:', error.response ? error.response.data : error.message);
        res.status(500).send('Error uploading document');
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
