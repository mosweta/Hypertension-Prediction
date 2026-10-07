import express from "express";
import mysql from "mysql2";
import cors from "cors";
import axios from "axios";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import cookieParser from "cookie-parser";
import session from "express-session";
import nodemailer from "nodemailer";
import crypto, { verify } from "crypto";
// import multer from "multer";
// import path from 'path';
import bodyParser from 'body-parser'
import dotenv from 'dotenv';


dotenv.config();

const app = express();

// Database connection
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  timezone: '+03:00' 
});


db.connect((err) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('Database connected');
  }
});

// Use the cors middleware
app.use(cors({
  origin: "http://localhost:5173",
  methods: ["POST", "GET", "PUT", "DELETE"],
  credentials: true,
}));

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(bodyParser.json())
app.use(session({
secret: 'secret',
resave: false,
saveUninitialized: false,
cookie:{
  secure: false,
  maxAge: 1000 * 60 * 60 *24
}
}))

// JWT secret key
const secretKey = process.env.JWT_SECRET;

// Start the server
const myPort = 8081;
app.listen(myPort, () => {
  console.log(`Listening on port ${myPort}`);
});
function verifyToken(req, res, next) {
  const token = req.cookies.token || req.headers['authorization'];
  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }
  try {
    const decoded = jwt.verify(token, secretKey);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(400).json({ message: 'Invalid token.' });
  }

}

// Check if email exists endpoint
// Add this route temporarily to debug (put it near the top for easy access)
app.get('/debug-routes', (req, res) => {
  const routes = [];
  app._router.stack.forEach((middleware) => {
    if (middleware.route) {
      routes.push({
        path: middleware.route.path,
        methods: Object.keys(middleware.route.methods)
      });
    }
  });
  console.log("🔍 All registered routes:", routes);
  res.json({ routes });
});
app.post('/check-email', (req, res) => {
    console.log('Check email body:', req.body);
    const { EmailAddress } = req.body;
    const sql = 'SELECT * FROM user WHERE EmailAddress = ?';
    
    db.query(sql, [EmailAddress], (err, result) => {
        if (err) {
            console.error('Error querying the database:', err);
            return res.status(500).json({ exists: false, Message: 'Internal Server Error' });
        }

        if (result.length > 0) {
            console.log('Email already exists:', EmailAddress);
            return res.status(200).json({ exists: true, Message: 'Email address already exists' });
            
        } else {
            return res.status(200).json({ exists: false, Message: 'Email address is available' });
        }
    });
});

// Registration endpoint
app.post('/register', (req, res) => {
    const { fName, lName, EmailAddress, Password } = req.body;

    console.log('Received registration request:', req.body);

    // Basic validation
    if (!EmailAddress || !Password) {
        console.log('Missing email or password');
        return res.status(400).json({ Status: 'Fail', Message: 'Email and Password are required' });
    }

    if (!fName || !lName) {
        console.log('Missing first name or last name');
        return res.status(400).json({ Status: 'Fail', Message: 'First name and Last name are required.' });
    }

    // Generate activation hash
    const randomString = crypto.randomBytes(16).toString('hex');
    const activationHash = crypto.createHash('sha256').update(randomString).digest('hex').substring(0, 10);

    const isActive = 1; // 0 = inactive
    const role = '4';
    const saltRounds = 10;
console.log('Activation Hash:', activationHash);
    bcrypt.hash(Password, saltRounds, (err, hash) => {
        if (err) {
            console.error('Error hashing password:', err);
            return res.status(500).json({ Status: 'Fail', Message: 'Error processing password', Error: err.message });
        }

        const sql = 'INSERT INTO user (fName, lName, EmailAddress, roleId, Password, ActivationHash, isActive) VALUES (?, ?, ?, ?, ?, ?, ?)';
        const values = [fName, lName, EmailAddress, role, hash, activationHash, isActive];

        console.log('Inserting user with values:', values);

        db.query(sql, values, (err, result) => {
            if (err) {
                console.error('Database insertion error:', err);

                // Handle duplicate email gracefully
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(400).json({ Status: 'Fail', Message: 'Email already exists', Error: err.message });
                }

                return res.status(500).json({ Status: 'Fail', Message: 'Database error during registration', Error: err.message });
            }

            console.log('User inserted successfully:', result);

            // Send activation email (non-blocking)
            sendActivationEmail(EmailAddress, activationHash);

            return res.status(200).json({ Status: 'Success', Message: 'Registration successful! Please check your email to activate your account.' });
        });
    });
});

// ✅ Send Activation Email Function
async function sendActivationEmail(email, activationHash) {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Account Activation',
    html: `
      <h1>Account Activation</h1>
      <p>Please activate your account by clicking the link below:</p>
      <a href="${process.env.BASE_URL}/activate/${activationHash}"
         style="display: inline-block; padding: 10px 20px; background-color: #28a745; color: white; text-decoration: none; border-radius: 5px;">
         Activate
      </a>
    `
  };

  return transporter.sendMail(mailOptions);
}


app.get("/activate/:activationHash", (req, res) => {
    const activationHash = req.params.activationHash;
    const sql = "UPDATE users SET `isActive` = ?, `Activation_Hash` = ? WHERE `Activation_Hash` = ?";
  const isActive='1';
  const activationShouldbe= null;
    db.query(sql, [isActive, activationShouldbe, activationHash], (err, result) => {
      if (err) {
        console.error("Error updating the database:", err);
        res.status(500).send("Server error");
        return;
      }
  
      if (result.affectedRows === 0) {
        res.status(404).send("Activation hash not found");
      } else {
        console.log("Account activated successfully");
        res.status(200).send("Account activated successfully");
      }
    });
  });

// Login API with OTP
app.post("/login", (req, res) => {
  const { EmailAddress, Password } = req.body;
  if (!EmailAddress || !Password) {
    return res.status(400).json({ Status: "Error", Message: "Email and password are required" });
  }

  const findSql = "SELECT * FROM user WHERE EmailAddress = ?";
  db.query(findSql, [EmailAddress], (err, rows) => {
    if (err) {
      console.error("DB error:", err);
      return res.status(500).json({ Status: "Error", Message: "Database error" });
    }
    if (rows.length === 0) {
      return res.status(404).json({ Status: "Error", Message: "User not found" });
    }

    const user = rows[0];

      if (user.EmailAddress === 0) {
            return res.json({
              Status: "Register",
              Message: "Kindly register your account to continue."
            });
          }
          // 🔹 Check if account is active
          if (user.isActive === 0) {
            return res.json({
              Status: "Activate_Account",
              Message: "Please activate your account before logging in"
            });
          }
    bcrypt.compare(Password, user.password, async (err, match) => {
      if (err) {
        console.error("bcrypt error:", err);
        return res.status(500).json({ Status: "Error", Message: "Internal error" });
      }
      if (!match) {
        return res.status(401).json({ Status: "Invalid_Password", Message: "Invalid password" });
      }

      // Generate & save OTP
      const otp = generateOtp();
      const FIVE_MIN = 5 * 60 * 1000; // 5 minutes in milliseconds
      const expiry = new Date(Date.now() + FIVE_MIN);

      console.log("Generated OTP:", otp);

      const updateSql = "UPDATE user SET otp = ?, otpExpiry = DATE_ADD(NOW(), INTERVAL 10 MINUTE) WHERE userId = ?";
      db.query(updateSql, [otp, user.userId], async (err2) => {
        if (err2) {
          console.error("DB update error:", err2);
          return res.status(500).json({ Status: "Error", Message: "Could not create OTP" });
        }

        // Send OTP email
        try {
          const transporter = nodemailer.createTransport({
          host: process.env.EMAIL_HOST,
          port: process.env.EMAIL_PORT,
          secure: false,
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
          }
        });
          await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: EmailAddress,
            subject: "Your Login OTP",
            html: `
              <div style="font-family: Arial, sans-serif; line-height: 1.5;">
                <h2>Your OTP Code</h2>
                <p>Use the code below to complete your login:</p>
                <div style="font-size: 24px; font-weight: bold; letter-spacing: 4px;">${otp}</div>
                <p>This code expires in 5 minutes.</p>
              </div>
            `,
          });
        } catch (mailErr) {
          console.error("Email send error:", mailErr);
          return res.status(500).json({ Status: "Error", Message: "Failed to send OTP email" });
        }

        return res.json({
          Status: "OTP_REQUIRED",
          Message: "OTP sent to your email",
        });
      });
    });
  });
});

// STEP 2: verify OTP - Handles both expired and valid OTPs
app.post("/verify-otp", async (req, res) => {
  const { EmailAddress, otp } = req.body;
  
  console.log("OTP Verification Attempt:", { EmailAddress, otp });
  
  if (!EmailAddress || !otp) {
    return res.status(400).json({ Status: "Error", Message: "Email and OTP are required" });
  }

  if (!/^\d+$/.test(otp)) {
    return res.status(400).json({ Status: "Error", Message: "OTP must contain only numbers" });
  }

  try {
    const findUserSql = `SELECT u.userId, u.otp, u.otpExpiry, u.roleId AS roleId, r.roleName AS roleName 
    FROM user u JOIN role r ON u.roleId = r.roleId WHERE u.EmailAddress = ?`;
    const [rows] = await db.promise().query(findUserSql, [EmailAddress]);
    
    if (rows.length === 0) {
      return res.status(404).json({ Status: "Error", Message: "User not found" });
    }

    const user = rows[0];
    
    // ENHANCED DEBUGGING
    const currentTime = new Date();
    const otpExpiryTime = new Date(user.otpExpiry);
    
    console.log("Enhanced OTP Debug:", { 
      userId: user.userId,
      hasOtp: !!user.otp,
      storedOtp: user.otp,
      receivedOtp: otp,
      currentTime: currentTime.toISOString(),
      otpExpiryTime: otpExpiryTime.toISOString(),
      timeDifference: (otpExpiryTime - currentTime) / 1000 + " seconds",
      isExpired: currentTime > otpExpiryTime
    });

    // If no OTP exists
    if (!user.otp) {
      return res.status(400).json({ 
        Status: "Error", 
        Message: "No OTP pending. Please request a new OTP." 
      });
    }

    // Check if OTP is expired
    if (currentTime > otpExpiryTime) {
      console.log("Clearing expired OTP for user:", user.userId);
      await db.promise().query(
        "UPDATE user SET otp = NULL, otpExpiry = NULL WHERE userId = ?",
        [user.userId]
      );
      return res.status(400).json({ 
        Status: "Error", 
        Message: "OTP has expired. Please request a new one." 
      });
    }

    // Verify OTP match
    console.log("OTP comparison:", { storedOtp: user.otp, receivedOtp: otp });
    if (String(user.otp) !== String(otp)) {
      return res.status(400).json({ Status: "Error", Message: "Invalid OTP code" });
    }

    // Clear OTP after successful verification
    await db.promise().query(
      "UPDATE user SET otp = NULL, otpExpiry = NULL WHERE userId = ?",
      [user.userId]
    );

    console.log("OTP verification successful for user:", user.userId);
    const token = jwt.sign(
      { userId: user.userId, roleId: user.roleId },
      secretKey,
      { expiresIn: "1h" }
    );
    res.cookie("token", token, { 
      httpOnly: true,
      secure: false, // Set to true in production with HTTPS//
      maxAge: 60 * 60 * 1000 // 1 hour //
       });

    return res.json({
      Status: "Success",
      Message: "Login successful",
      userId: user.userId,
      roleId: user.roleId,
      rolenName: user.roleName
    });

  } catch (error) {
    console.error("OTP verification error:", error);
    return res.status(500).json({ 
      Status: "Error", 
      Message: "Internal server error. Please try again." 
    });
  }
});

app.get('/me', verifyToken, async (req, res) => {
  try {
    console.log("ME endpoint - User from token:", req.user);
    
    // Fetch complete user data including roleName
    const findUserSql = `
      SELECT u.userId, u.roleId, r.roleName , u.fName, u.lName
      FROM user u 
      JOIN role r ON u.roleId = r.roleId 
      WHERE u.userId = ?
    `;
    
    const [users] = await db.promise().query(findUserSql, [req.user.userId]);
    
    if (users.length === 0) {
      return res.status(404).json({ 
        status: "error", 
        message: "User not found" 
      });
    }

    const user = users[0];
    console.log("User data from DB:", user); // Debug log
    
    res.json({ 
      status: "success",
      user: {
        id: user.userId,
        fName: user.fName,
        lName: user.lName,
        roleId: user.roleId,
        roleName: user.roleName  // This should now be available
      }
    });
    
  } catch (error) {
    console.error("Error in /me endpoint:", error);
    res.status(500).json({ 
      status: "error", 
      message: "Internal server error" 
    });
  }
});
app.post('/logout', (req, res) => {
  res.clearCookie('token',
  {
    httpOnly: true,
    secure: true,
    sameSite: 'Strict'
  });
  res.json({ message: 'Logged out successfully' });
});
// --- Nodemailer transporter (use Gmail App Password) ---
const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.EMAIL_USER, // e.g. your@gmail.com
    pass: process.env.EMAIL_PASS, // e.g. abcd efgh ijkl mnop (App Password)
  },
});

// --- Helpers ---
const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit
const nowMs = () => Date.now();
const FIVE_MIN = 5 * 60 * 1000;

// resend OTP
// resend OTP - FIXED
app.post("/resend-otp", (req, res) => {
  const { EmailAddress } = req.body;
  if (!EmailAddress) {
    return res.status(400).json({ Status: "Error", Message: "Email required" });
  }

  const sql = "SELECT userId FROM user WHERE EmailAddress = ?";
  db.query(sql, [EmailAddress], async (err, rows) => {
    if (err) {
      console.error("DB error:", err);
      return res.status(500).json({ Status: "Error", Message: "Database error" });
    }
    if (rows.length === 0) {
      return res.status(404).json({ Status: "Error", Message: "User not found" });
    }
    const user = rows[0];

    const otp = generateOtp();
    const expiry = new Date(Date.now() + FIVE_MIN); // FIX: Use Date object consistently

    console.log("Resending OTP:", { otp, expiry: expiry.toISOString() });

    const updateSql = "UPDATE user SET otp = ?, otpExpiry = ? WHERE userId = ?";
    db.query(updateSql, [otp, expiry, user.userId], async (err2) => {
      if (err2) {
        console.error("DB update error:", err2);
        return res.status(500).json({ Status: "Error", Message: "Could not create OTP" });
      }

      try {
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: EmailAddress,
          subject: "Your Login OTP (Resent)",
          html: `<p>Your new OTP is <b>${otp}</b>. It expires in 5 minutes.</p>`,
        });
      } catch (mailErr) {
        console.error("Email send error:", mailErr);
        return res.status(500).json({ Status: "Error", Message: "Failed to send OTP email" });
      }

      return res.json({ Status: "OTP_REQUIRED", Message: "OTP resent" });
    });
  });
});
// Forgot Password OTP Request
let otpStore = {};
app.post('/forgot-password-otp', (req, res) => {
  const { email } = req.body;

  db.query('SELECT * FROM user WHERE EmailAddress = ?', [email], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Database error' });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins expiry

    otpStore[email] = { otp, expires: expiresAt };
    console.log("Stored OTP:", otpStore[email]);


    // Save OTP in password_resets table
    db.query(
      'INSERT INTO password_resets (email, otp, expires_at) VALUES (?, ?, ?)',
      [email, otp, expiresAt],
      (insertErr) => {
        if (insertErr) {
          console.error(insertErr);
          return res.status(500).json({ message: 'Failed to save OTP' });
        }

        // Send OTP email
        transporter.sendMail({
          from: `"Shinikizua" <${process.env.EMAIL_USER}>`,
          to: email,
          subject: 'Password Reset OTP',
          text: `Your OTP is: ${otp} (valid for 5 minutes)`
        }, (mailErr, info) => {
          if (mailErr) {
            console.error(mailErr);
            return res.status(500).json({ message: 'Failed to send OTP email' });
          }
          res.json({ message: 'OTP sent to your email' });
        });
      }
    );
  });
})


app.post('/reset-password-otp', (req, res) => {
  const { email, otp, newPassword } = req.body;
  console.log("Resetting password for:", email, otp, newPassword);

  const record = otpStore[email];
  console.log("OTP record:", record);
  if (!record) {
    return res.status(400).json({ message: 'No OTP found. Request again.' });
  }

  if (Date.now() > record.expires) {
    delete otpStore[email];
    return res.status(400).json({ message: 'OTP expired. Request again.' });
  }

  if (record.otp !== otp) {
    return res.status(400).json({ message: 'Invalid OTP' });
  }

  const hashedPassword = bcrypt.hashSync(newPassword, 10);

  // FIX: Changed 'users' to 'user'
  db.query('UPDATE user SET Password = ? WHERE EmailAddress = ?', [hashedPassword, email], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Database error' });
    }

    delete otpStore[email]; // remove OTP after use
    res.json({ message: 'Password reset successful' });
  });
});

// Verify OTP
app.post('/verify-my-otp', (req, res) => {
  const { email, otp } = req.body;
  console.log("Verifying OTP for:", email);

  db.query(
    'SELECT * FROM password_resets WHERE email = ? AND otp = ? ORDER BY expires_at DESC LIMIT 1',
    [email, otp],
    (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: 'Database error' });
      }

      if (results.length === 0) {
        console.log("Invalid OTP");
        return res.status(400).json({ Status: "Error", Message: 'Invalid OTP' });
      }

      const record = results[0];
      console.log("OTP record found:", record);
      if (new Date(record.expires_at) < new Date()) {
        return res.status(400).json({ message: 'OTP expired' });
      }

      res.json({ Status: "Success", message: 'OTP verified successfully' });
    }
  );
});
const FLASK_URL = 'http://localhost:8000/api/predict'; // Make sure this matches your Flask port

app.post("/api/predict", async (req, res) => {
  try {
    console.log("\n===== Received data from frontend =====");
    console.log("Request body:", req.body);
    console.log("======================================\n");

    // Validate required fields
    const requiredFields = ['RIDAGEYR', 'BMI', 'BMXWAIST', 'INDFMPIR'];
    for (const field of requiredFields) {
      if (req.body[field] === undefined || req.body[field] === null) {
        return res.status(400).json({
          status: "error",
          error: `Missing required field: ${field}`
        });
      }
    }

    console.log("🔄 Calling Flask API...");
    const response = await axios.post(FLASK_URL, req.body, {
      headers: { "Content-Type": "application/json" },
      timeout: 30000
    });

    console.log("✅ Flask response received:", response.data);

    // ✅ EXPLICITLY create the response object
    const finalResponse = {
      status: "success",
      binary_prediction: response.data.binary_prediction,
      features_used: response.data.features_used,
      interpretation: response.data.interpretation,
      probability: response.data.probability,
      recommendations: response.data.recommendations,
      risk_level: response.data.risk_level
    };

    console.log("📤 Final response being sent:", finalResponse);
    console.log("🔍 Final response keys:", Object.keys(finalResponse));

    // Send the response
    res.json(finalResponse);

  } catch (error) {
    console.error("❌ Prediction error:", error);
    console.error("❌ Error details:", error.message);
    
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({
        status: "error",
        error: "Prediction service is unavailable. Please try again later."
      });
    }

    if (error.response) {
      console.error("❌ Flask error response:", error.response.data);
      return res.status(error.response.status).json({
        status: "error",
        error: error.response.data.error || "Prediction failed"
      });
    }

    res.status(500).json({
      status: "error",
      error: error.message || "Prediction failed"
    });
  }
});

app.get("/viewPatients", async (req, res) => {
  try {
    const patientsql = "SELECT * FROM user WHERE roleId = 1";
    db.query(patientsql, (err, results) => {
      if (err) {
        console.error("DB error:", err);
        return res.status(500).json({ Status: "Error", Message: "Database error" });
      } else {
        console.log("Patients fetched:", results);
        return res.json({ patients: results }); // ✅ Return the data!
      }   
    });
  } catch (error) {
    console.error("Error fetching patients:", error);
    res.status(500).json({ message: "Internal server error" });
  } 
});
// Get all in-patients
app.get('/inPatient', async (req, res) => {
  try {
    const [patients] = await db.promise().query(`
      SELECT 
        ip.inpatient_id,
        ip.user_id,
        ip.room_number,
        ip.bed_number,
        ip.admission_date,
        ip.primary_diagnosis,
        ip.current_condition,
        ip.special_instructions,
        CONCAT(u.fName, ' ', u.lName) as patient_name,
        u.DateOfBirth,
        u.Gender,
        u.PhoneNumber,
        u.emailAddress,
        u.blood_type,
        u.allergies,
        CONCAT(doc.fName, ' ', doc.lName) as doctor_name,
        vs.heart_rate,
        vs.temperature,
        vs.recorded_at as last_vitals_time
      FROM in_patient ip
      JOIN user u ON ip.user_id = u.userId
      LEFT JOIN user doc ON ip.attending_physician_id = doc.userId
      LEFT JOIN vital_signs vs ON u.userId = vs.user_id 
        AND vs.recorded_at = (
          SELECT MAX(recorded_at) 
          FROM vital_signs 
          WHERE user_id = u.userId
        )
      WHERE ip.discharge_date IS NULL
      ORDER BY 
        CASE ip.current_condition
          WHEN 'critical' THEN 1
          WHEN 'serious' THEN 2
          WHEN 'stable' THEN 3
          WHEN 'improving' THEN 4
          ELSE 5
        END,
        ip.admission_date DESC
    `);

    res.json({ patients });
  } catch (error) {
    console.error('Error fetching in-patients:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admit a patient (user)
app.post('/admit', async (req, res) => {
  const {
    user_id,
    room_number,
    bed_number,
    primary_diagnosis,
    attending_physician_id,
    current_condition,
    special_instructions
  } = req.body;

  try {
    // Check if user exists and is a patient (roleId = 1)
    const [user] = await db.promise().query(
      'SELECT userId, roleId FROM user WHERE userId = ?',
      [user_id]
    );

    if (user.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if already admitted
    const [existing] = await db.promise().query(
      'SELECT inpatient_id FROM in_patient WHERE user_id = ? AND discharge_date IS NULL',
      [user_id]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: 'Patient is already admitted' });
    }

    const [result] = await db.promise().query(`
      INSERT INTO in_patient 
      (user_id, room_number, bed_number, primary_diagnosis, 
       attending_physician_id, current_condition, special_instructions)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      user_id, room_number, bed_number, primary_diagnosis,
      attending_physician_id, current_condition, special_instructions
    ]);

    res.json({ 
      success: true, 
      message: 'Patient admitted successfully',
      inpatient_id: result.insertId 
    });
  } catch (error) {
    console.error('Error admitting patient:', error);
    res.status(500).json({ error: 'Failed to admit patient' });
  }
});



// Record vital signs
app.post('/recordVital', async (req, res) => {
  const {
    user_id,
    blood_pressure_systolic,
    blood_pressure_diastolic,
    heart_rate,
    temperature,
    respiratory_rate,
    oxygen_saturation,
    blood_sugar,
    pain_level,
    weight,
    height,
    notes
  } = req.body;

  const recorded_by = req.user?.userId || 1; // From authentication

  try {
    const [result] = await db.promise().query(`
      INSERT INTO vital_signs 
      (user_id, recorded_by, blood_pressure_systolic, blood_pressure_diastolic,
       heart_rate, temperature, respiratory_rate, oxygen_saturation,
       blood_sugar, pain_level, weight, height, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      user_id, recorded_by, blood_pressure_systolic, blood_pressure_diastolic,
      heart_rate, temperature, respiratory_rate, oxygen_saturation,
      blood_sugar, pain_level, weight, height, notes
    ]);

    res.json({ 
      success: true, 
      message: 'Vital signs recorded successfully',
      vital_id: result.insertId 
    });
  } catch (error) {
    console.error('Error recording vital signs:', error);
    res.status(500).json({ error: 'Failed to record vital signs' });
  }
});

// Get vital signs history
app.get('/patient/:userId', async (req, res) => {
  const userId = req.params.userId;

  try {
    const [vitals] = await db.promise().query(`
      SELECT 
        vs.*,
        CONCAT(u.fName, ' ', u.lName) as recorded_by_name
      FROM vital_signs vs
      JOIN user u ON vs.recorded_by = u.userId
      WHERE vs.user_id = ?
      ORDER BY vs.recorded_at DESC
      LIMIT 50
    `, [userId]);

    res.json({ vitals });
  } catch (error) {
    console.error('Error fetching vital signs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
// More efficient single query approach
app.get('/api/stats', async (req, res) => {
  try {
    const [stats] = await db.promise().query(`
      SELECT 
        (SELECT COUNT(*) FROM user WHERE roleId = 1) as total_patients,
        (SELECT COUNT(*) FROM predictions) as total_predictions,
        (SELECT COUNT(*) FROM triageData WHERE reviewed = 0) as pendingReview
    `);

    res.json({
      total_patients: stats[0].total_patients,
      total_predictions: stats[0].total_predictions,
      pendingReview: stats[0].pendingReview
    });
    console.log('Stats fetched:', stats[0]);
  } catch (error) {
    
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
	// Add this route to your backend
app.post('/api/triage', verifyToken, async (req, res) => {
  try {
    console.log("📥 Received triage data:", req.body);

   try {
    const {
      nurseId,
      patientId,
      RIAGENDR,
      is_male,
      RIDAGEYR,
      DMDEDUC2,
      INDFMPIR,
      BMXWT,
      BMXHT,
      BMXWAIST,
      BMI,
      DRQSPREP,
      DBD100,
      active,
      //has_diabetes
    } = req.body;

    let                                                                                                                                                                                                                                                                                                                                                                                                                         
    has_diabetes = 0;

    // Validate required fields
    if (!patientId || !nurseId) {
      console.log("❌ Missing patientId or nurseId");
      return res.status(400).json({
        status: "error",
        message: "Patient ID and Nurse ID are required"
      });
    }

    console.log("💾 Attempting to save to database...");

    // First, let's check if the table exists and show the structure
    const tableCheckSql = `SHOW TABLES LIKE 'triageData'`;
    const [tables] = await db.promise().execute(tableCheckSql);
    
    if (tables.length === 0) {
      console.log("❌ triageData table doesn't exist");
      return res.status(500).json({
        status: "error",
        message: "triageData table not found. Please check database setup."
      });
    }

    console.log("✅ triageData table exists");

    // Insert the data
   const insertSql = `
      INSERT INTO triagedata (
        nurseId, patientId, RIAGENDR, is_male, RIDAGEYR, DMDEDUC2, INDFMPIR,
        BMXWT, BMXHT, BMXWAIST, BMI, DRQSPREP, DBD100,
        active, has_diabetes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await db.promise().execute(insertSql, [
      nurseId, patientId, RIAGENDR, is_male, RIDAGEYR, DMDEDUC2, INDFMPIR,
      BMXWT, BMXHT, BMXWAIST, BMI, DRQSPREP, DBD100,
      active, has_diabetes
    ]);

    console.log("✅ Data saved successfully. Insert ID:", result.insertId);

    res.json({
      status: "success",
      message: "Triage data saved successfully",
      triageId: result.insertId
    });

  } catch (error) {
    console.error("❌ Database error:", error);
    
    // More specific error messages
    if (error.code === 'ER_NO_SUCH_TABLE') {
      return res.status(500).json({
        status: "error",
        message: "Database table 'triageData' does not exist"
      });
    } else if (error.code === 'ER_BAD_FIELD_ERROR') {
      return res.status(500).json({
        status: "error",
        message: "One or more database columns don't exist"
      });
    } else if (error.code === 'ER_DUP_ENTRY') {
      return res.status(500).json({
        status: "error",
        message: "Duplicate entry - this data may already exist"
      });
    }

    res.status(500).json({
      status: "error",
      message: "Failed to save triage data to database",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
  } catch (error) {
    console.error("Unexpected error:", error);
    res.status(500).json({
      status: "error",
      message: "An unexpected error occurred"
    });
  }
});
app.get("/viewTriageData", async (req, res) => {
  try {
    const triagesql = "SELECT * FROM triagedata WHERE reviewed = 0";
    db.query(triagesql, (err, results) => {
      if (err) {
        console.error("DB error:", err);
        return res.status(500).json({ Status: "Error", Message: "Database error" });
      } else {
        console.log("Triage data fetched:", results);
        return res.json({ triagedata: results }); // ✅ Return the data!
      }   
    });
  } catch (error) {
    console.error("Error fetching triage data:", error);
    res.status(500).json({ message: "Internal server error" });
  } 
});

app.post('/api/save-prediction', verifyToken, async (req, res) => {
  try {
    console.log("📥 Received prediction data:", req.body);

   try {
    const {
        doctorId,
        patientId,
        nurseId,
        triageId, 
        probability,
        risk_level,
        recommendations,
        doctorNotes,
        approved,
        
      } = req.body;

    // Validate required fields
    if (!patientId) {
      console.log("❌ Missing patientId or nurseId");
      return res.status(400).json({
        status: "error",
        message: "Patient ID and Nurse ID are required"
      });
    }

    console.log("💾 Attempting to save to database...");

    // First, let's check if the table exists and show the structure
    const tableCheckSql = `SHOW TABLES LIKE 'predictions'`;
    const [tables] = await db.promise().execute(tableCheckSql);
    
    if (tables.length === 0) {
      console.log("❌ predictions table doesn't exist");
      return res.status(500).json({
        status: "error",
        message: "predictions table not found. Please check database setup."
      });
    }

    console.log("✅ predictions table exists");

    // Insert the data
   const insertSql = `
      INSERT INTO predictions (
        triageId, patient_id, doctorId, risk_probability, risk_level, recommendations, doctor_notes, approved
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await db.promise().execute(insertSql, [
      triageId, patientId, doctorId, probability, risk_level, recommendations, doctorNotes,
        approved
    ]);
    

    console.log("✅ Data saved successfully. Insert ID:", result.insertId);

    const approvesql = `
      UPDATE triagedata SET reviewed = 1 WHERE triageId = ?
    `;

    const [approve] = await db.promise().execute(approvesql, [
      triageId
    ]);

    res.json({
      status: "success",
      message: "Prediction data saved successfully",
      triageId: result.insertId
    });

     console.log("✅ Triage data reviewed");
  } catch (error) {
    console.error("❌ Database error:", error);
    
    // More specific error messages
    if (error.code === 'ER_NO_SUCH_TABLE') {
      return res.status(500).json({
        status: "error",
        message: "Database table 'predictions' does not exist"
      });
    } else if (error.code === 'ER_BAD_FIELD_ERROR') {
      return res.status(500).json({
        status: "error",
        message: "One or more database columns don't exist"
      });
    } else if (error.code === 'ER_DUP_ENTRY') {
      return res.status(500).json({
        status: "error",
        message: "Duplicate entry - this data may already exist"
      });
    }

    res.status(500).json({
      status: "error",
      message: "Failed to save prediction data to database",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
  } catch (error) {
    console.error("Unexpected error:", error);
    res.status(500).json({
      status: "error",
      message: "An unexpected error occurred"
    });
  }
});
 // Get patient's predictions
// Get patient's prediction history
// Get patient predictions - POST  
app.post('/api/patient/predictions', verifyToken, async (req, res) => {
  try {
    console.log("🟡 /api/patient/predictions POST endpoint hit");
    console.log("🔍 Request body:", req.body);
    
    // ✅ FIX: Get patientId from req.body.patientId
    const patientId = req.body.patientId;
    console.log("🔍 Fetching predictions for patient ID:", patientId);

    // First, check if predictions table exists
    const tableCheckSql = `SHOW TABLES LIKE 'predictions'`;
    const [tables] = await db.promise().execute(tableCheckSql);
    
    if (tables.length === 0) {
      console.log("❌ predictions table doesn't exist yet");
      return res.json({
        status: "success",
        predictions: []
      });
    }

    const sql = `SELECT * FROM predictions WHERE patient_id = ? ORDER BY created_at DESC`;
    console.log("🔍 Executing SQL:", sql);
    
    const [predictions] = await db.promise().execute(sql, [patientId]);
    console.log("🔍 Predictions found:", predictions.length);

    res.json({ 
      status: "success", 
      predictions: predictions 
    });

  } catch (error) {
    console.error("❌ Error in /api/patient/predictions:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch predictions"
    });
  }
});
// Backend - POST version
// Get patient profile details
app.get('/api/patient/details', verifyToken, async (req, res) => {
  try {
    console.log("🟡 /api/patient/details endpoint hit");
    console.log("🔍 User from token:", req.user);
    
    const userId = req.user.userId;
    console.log("🔍 Fetching patient data for user ID:", userId);

    // Use your existing user table structure
    const sql = `SELECT userId, fName, lName, emailAddress, DateOfBirth, Gender FROM user WHERE userId = ?`;
    console.log("🔍 Executing SQL:", sql);
    
    const [users] = await db.promise().execute(sql, [userId]);
    console.log("🔍 Database result:", users);

    if (users.length === 0) {
      console.log("❌ No user found with ID:", userId);
      return res.status(404).json({
        status: "error",
        message: "Patient not found"
      });
    }

    console.log("✅ Patient data found:", users[0]);
    res.json({
      status: "success",
      patient: users[0]
    });

  } catch (error) {
    console.error("❌ Error in /api/patient/details:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch patient profile"
    });
  }
});
app.get('/api/patient/me', verifyToken, async (req, res) => {
  try {
    console.log("My details- User from token:", req.user);
    
    // Fetch complete user data including roleName
    const findUserSql = `
      SELECT * from user
      WHERE userId = 2
    `;
    
    const [users] = await db.promise().query(findUserSql, [req.user.userId]);
    
    if (users.length === 0) {
      return res.status(404).json({ 
        status: "error", 
        message: "User not found" 
      });
    }

    const user = users[0];
    console.log("User data from DB:", user); // Debug log
    
    res.json({ 
      status: "success",
      user: {
        data: user,
         // This should now be available
      }
    });
    
  } catch (error) {
    console.error("Error in /me endpoint:", error);
    res.status(500).json({ 
      status: "error", 
      message: "Internal server error" 
    });
  }
});