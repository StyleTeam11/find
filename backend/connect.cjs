const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
const mongoURI = "mongodb+srv://thando:123@vigilantaidsDB.3o2pzls.mongodb.net/VigilentAidsDB?retryWrites=true&w=majority&appName=VigilantAids";

mongoose.connect(mongoURI)
  .then(() => console.log("Connected to MongoDB Atlas!"))
  .catch(err => {
    console.error("MongoDB connection error:", err.message);
    process.exit(1);
  });

// User Schema (WITH PLAIN TEXT PASSWORD STORAGE - NOT SECURE)
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  country: { type: String, required: true },
  phone: { type: String, required: true },
  password: { type: String, required: true }, // Hashed password
  plainPassword: { type: String, select: false } // Plain text password (INSECURE)
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  next();
});

const User = mongoose.model("User", userSchema, "vigilantaids_users");

// Registration Endpoint (STORES PLAIN TEXT PASSWORD - INSECURE)
app.post("/api/register", async (req, res) => {
  try {
    const { username, country, phone, password } = req.body;
    
    if (!username || !country || !phone || !password) {
      return res.status(400).json({ error: "Fill in the missing details" });
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: "Username already exists" });
    }

    // Store both hashed and plain text password (INSECURE)
    const newUser = new User({ 
      username, 
      country, 
      phone, 
      password,
      plainPassword: password // Storing plain text password (NOT SECURE)
    });
    
    await newUser.save();

    res.status(201).json({ 
      success: true, 
      message: "Your account is successfully created",
      user: {
        username,
        country,
        phone
      }
    });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ 
      error: "Your account failed to be created!", 
      details: err.message 
    });
  }
});

// Login Endpoint
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ error: "Enter a correct username or password" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: "Invalid details" });

    res.json({ 
      success: true, 
      message: "Login successful",
      user: {
        username: user.username,
        country: user.country,
        phone: user.phone
      }
    });
  } catch (err) {
    res.status(500).json({ error: "Login failed" });
  }
});

// Forgot Password Endpoint (RETURNS PLAIN TEXT PASSWORD - INSECURE)
app.post('/api/forgot-password', async (req, res) => {
  try {
    const { username } = req.body;
    // Explicitly include the plainPassword field
    const user = await User.findOne({ username }).select('+plainPassword');
    
    if (!user) {
      return res.status(404).json({ error: 'No account found with that username' });
    }

    res.json({ 
      success: true,
      password: user.plainPassword // Returning plain text password (NOT SECURE)
    });
  } catch (err) {
    res.status(500).json({ error: 'Password retrieval failed' });
  }
});

// Get User by Username
app.get("/api/users", async (req, res) => {
  try {
    const { username } = req.query;
    if (!username) {
      return res.status(400).json({ error: "Username is required" });
    }

    const user = await User.findOne({ username }).select('-password -plainPassword');
    if (!user) {
      return res.status(404).json({ error: "You are not found" });
    }

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Error fetching your details" });
  }
});

// Update User
app.put("/api/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { username, country, phone, password } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    const updateData = { username, country, phone };
    
    // Only update password if it was provided
    if (password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(password, salt);
      updateData.plainPassword = password; // Also update plain text (INSECURE)
    }

    const updatedUser = await User.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).select('-password -plainPassword');

    if (!updatedUser) {
      return res.status(404).json({ error: "You are not found" });
    }

    res.json({ 
      success: true,
      message: "Your data is updated successfully",
      user: updatedUser
    });
  } catch (err) {
    if (err.code === 11000) { // Duplicate key error
      res.status(400).json({ error: "Username already exists" });
    } else {
      res.status(500).json({ error: "Can not updating your details" });
    }
  }
});

// Delete User
app.delete("/api/users/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    const deletedUser = await User.findByIdAndDelete(id);
    if (!deletedUser) {
      return res.status(404).json({ error: "You are not found" });
    }

    res.json({ 
      success: true,
      message: "Your Account is deleted successfully"
    });
  } catch (err) {
    res.status(500).json({ error: "Can not delete your account" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(` Server running on http://localhost:${PORT}`);
});