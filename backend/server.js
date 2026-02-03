const express = require('express');
const fs = require('fs');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

// Path file database JSON
const LOGIN_FILE_PATH = path.join(__dirname, 'login_data.json');
const COURSE_FILE_PATH = path.join(__dirname, 'course_data.json');

app.use(cors());
app.use(express.json());

/**
 * Helper untuk mendapatkan waktu dalam format string Indonesia
 */
const getFormattedTimestamp = (date = new Date()) => {
    return date.toLocaleString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    }).replace(/\./g, ':');
};

// ==========================================
// 1. ENDPOINT LOGIN & LOGOUT (LOGOUT DATA)
// ==========================================

app.post('/save-login', (req, res) => {
    const { email } = req.body;
    const now = new Date();
    const loginTime = getFormattedTimestamp(now);
    
    const newEntry = {
        email: email,
        login: loginTime,
        logout: "",
        time: "",
        _rawLogin: now.toISOString()
    };

    fs.readFile(LOGIN_FILE_PATH, 'utf8', (err, data) => {
        let json = [];
        if (!err && data) {
            try { json = JSON.parse(data); } catch (e) { json = []; }
        }
        json.push(newEntry);
        fs.writeFile(LOGIN_FILE_PATH, JSON.stringify(json, null, 2), (writeErr) => {
            if (writeErr) return res.status(500).json({ message: "Gagal menulis log login" });
            res.status(200).json({ message: "Login tercatat", login: loginTime });
        });
    });
});

app.post('/save-logout', (req, res) => {
    const { email } = req.body;
    const now = new Date();
    const logoutTime = getFormattedTimestamp(now);

    fs.readFile(LOGIN_FILE_PATH, 'utf8', (err, data) => {
        if (err) return res.status(500).json({ message: "Gagal membaca log" });
        let json = JSON.parse(data || '[]');
        
        let foundIndex = -1;
        for (let i = json.length - 1; i >= 0; i--) {
            if (json[i].email === email && json[i].logout === "") {
                foundIndex = i;
                break;
            }
        }
        
        if (foundIndex !== -1) {
            const entry = json[foundIndex];
            const start = new Date(entry._rawLogin);
            const diffMs = now - start;
            
            const hours = Math.floor(diffMs / 3600000);
            const mins = Math.floor((diffMs % 3600000) / 60000);
            const secs = Math.floor((diffMs % 60000) / 1000);
            
            let durationStr = hours > 0 ? `${hours} jam ` : "";
            durationStr += `${mins} mnt ${secs} dtk`;

            json[foundIndex].logout = logoutTime;
            json[foundIndex].time = durationStr;
            delete json[foundIndex]._rawLogin;

            fs.writeFile(LOGIN_FILE_PATH, JSON.stringify(json, null, 2), (writeErr) => {
                if (writeErr) return res.status(500).json({ message: "Gagal update logout" });
                res.status(200).json({ message: "Logout tercatat", duration: durationStr });
            });
        } else {
            res.status(404).json({ message: "Sesi login aktif tidak ditemukan" });
        }
    });
});

// ==========================================
// 2. ENDPOINT KURSUS (COURSE DATA)
// ==========================================

// Endpoint GET untuk mengambil semua data kursus agar bisa ditampilkan di tabel
app.get('/get-courses', (req, res) => {
    fs.readFile(COURSE_FILE_PATH, 'utf8', (err, data) => {
        if (err) {
            // Jika file belum ada, kirim array kosong
            return res.json([]);
        }
        try {
            const json = JSON.parse(data);
            res.json(json);
        } catch (e) {
            res.json([]);
        }
    });
});

// Endpoint POST untuk menyimpan kursus baru dari course_upload.html
app.post('/save-course', (req, res) => {
    const newCourse = req.body; // Menerima objek kursus lengkap

    fs.readFile(COURSE_FILE_PATH, 'utf8', (err, data) => {
        let json = [];
        if (!err && data) {
            try {
                json = JSON.parse(data);
            } catch (e) {
                json = [];
            }
        }
        
        json.push(newCourse);
        
        fs.writeFile(COURSE_FILE_PATH, JSON.stringify(json, null, 2), (writeErr) => {
            if (writeErr) {
                return res.status(500).json({ message: "Gagal menyimpan data kursus" });
            }
            res.status(200).json({ message: "Data kursus berhasil disimpan ke course_data.json" });
        });
    });
});

// ==========================================
// SERVER RUNNING
// ==========================================

app.listen(PORT, () => {
    console.log(`=================================`);
    console.log(`Backend Arkastone aktif di port ${PORT}`);
    console.log(`Log Login: ${LOGIN_FILE_PATH}`);
    console.log(`Data Kursus: ${COURSE_FILE_PATH}`);
    console.log(`=================================`);
});