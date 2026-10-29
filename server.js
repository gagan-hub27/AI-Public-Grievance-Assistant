require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const morgan = require("morgan");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));
app.use(express.static(path.join(__dirname, "public")));

const complaintSchema = new mongoose.Schema({
  reference: { type: String, unique: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, trim: true, lowercase: true, maxlength: 150 },
  phone: { type: String, trim: true, maxlength: 20, default: "" },
  category: { type: String, required: true, enum: [
    "Roads & Transport", "Water Supply", "Electricity", "Sanitation",
    "Public Safety", "Parks & Public Spaces", "Other"
  ]},
  department: { type: String, required: true },
  area: { type: String, required: true, trim: true, maxlength: 150 },
  address: { type: String, trim: true, maxlength: 300, default: "" },
  description: { type: String, required: true, trim: true, maxlength: 2500 },
  priority: { type: String, enum: ["Normal", "High"], default: "Normal" },
  status: { type: String, enum: ["Submitted", "Under Review", "In Progress", "Resolved", "Closed"], default: "Submitted" },
  updates: [{
    status: String,
    note: String,
    updatedAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

const Complaint = mongoose.model("Complaint", complaintSchema);

const departmentByCategory = {
  "Roads & Transport": "Public Works Department",
  "Water Supply": "Water & Sewerage Department",
  "Electricity": "Electricity Services",
  "Sanitation": "Sanitation & Waste Management",
  "Public Safety": "Public Safety Department",
  "Parks & Public Spaces": "Parks & Public Spaces",
  "Other": "Public Grievance Cell"
};

function makeReference() {
  const stamp = Date.now().toString(36).toUpperCase().slice(-5);
  const random = crypto.randomBytes(2).toString("hex").toUpperCase();
  return `PG-${stamp}-${random}`;
}

function publicComplaint(complaint) {
  return {
    reference: complaint.reference,
    category: complaint.category,
    department: complaint.department,
    area: complaint.area,
    description: complaint.description,
    priority: complaint.priority,
    status: complaint.status,
    createdAt: complaint.createdAt,
    updatedAt: complaint.updatedAt,
    updates: complaint.updates
  };
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, database: mongoose.connection.readyState === 1 ? "connected" : "disconnected" });
});

app.get("/api/stats", async (_req, res) => {
  try {
    const [total, resolved, inProgress, underReview] = await Promise.all([
      Complaint.countDocuments(),
      Complaint.countDocuments({ status: { $in: ["Resolved", "Closed"] } }),
      Complaint.countDocuments({ status: "In Progress" }),
      Complaint.countDocuments({ status: { $in: ["Submitted", "Under Review"] } })
    ]);
    res.json({ total, resolved, inProgress, underReview });
  } catch (err) {
    res.status(500).json({ message: "Could not load dashboard statistics." });
  }
});

app.get("/api/complaints/recent", async (_req, res) => {
  try {
    const complaints = await Complaint.find()
      .sort({ createdAt: -1 })
      .limit(6)
      .select("reference category area status priority createdAt department");
    res.json(complaints);
  } catch (err) {
    res.status(500).json({ message: "Could not load recent complaints." });
  }
});

app.post("/api/complaints", async (req, res) => {
  try {
    const { name, email, phone, category, area, address, description, priority } = req.body;
    if (!name || !email || !category || !area || !description) {
      return res.status(400).json({ message: "Please complete all required fields." });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: "Please enter a valid email address." });
    }
    if (String(description).trim().length < 20) {
      return res.status(400).json({ message: "Please add a little more detail (at least 20 characters)." });
    }
    if (!departmentByCategory[category]) {
      return res.status(400).json({ message: "Please select a valid category." });
    }

    const complaint = await Complaint.create({
      reference: makeReference(),
      name, email, phone, category, area, address, description,
      department: departmentByCategory[category],
      priority: priority === "High" ? "High" : "Normal",
      updates: [{ status: "Submitted", note: "Your complaint has been received and added to the queue." }]
    });

    res.status(201).json({
      message: "Your complaint has been submitted.",
      complaint: publicComplaint(complaint)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "We could not submit your complaint. Please try again." });
  }
});

app.get("/api/complaints/:reference", async (req, res) => {
  try {
    const reference = String(req.params.reference || "").trim().toUpperCase();
    const complaint = await Complaint.findOne({ reference });
    if (!complaint) return res.status(404).json({ message: "No complaint found with that reference. Check the ID and try again." });
    res.json({ complaint: publicComplaint(complaint) });
  } catch (err) {
    res.status(500).json({ message: "Could not look up this complaint." });
  }
});


// Admin-only complaint listing. The key is checked on the server for every request.
app.get("/api/admin/complaints", async (req, res) => {
  const adminKey = process.env.ADMIN_KEY;
  if (!adminKey || req.get("x-admin-key") !== adminKey) {
    return res.status(401).json({ message: "Admin key is missing or invalid." });
  }
  try {
    const { status, category, q } = req.query;
    const filter = {};
    if (status && ["Submitted", "Under Review", "In Progress", "Resolved", "Closed"].includes(status)) {
      filter.status = status;
    }
    if (category && departmentByCategory[category]) filter.category = category;
    if (q && String(q).trim()) {
      const term = String(q).trim().slice(0, 100);
      filter.$or = [
        { reference: { $regex: term, $options: "i" } },
        { name: { $regex: term, $options: "i" } },
        { email: { $regex: term, $options: "i" } },
        { area: { $regex: term, $options: "i" } }
      ];
    }
    const complaints = await Complaint.find(filter).sort({ createdAt: -1 }).limit(250);
    res.json({ complaints: complaints.map(c => ({
      reference: c.reference, name: c.name, email: c.email, phone: c.phone,
      category: c.category, department: c.department, area: c.area, address: c.address,
      description: c.description, priority: c.priority, status: c.status,
      createdAt: c.createdAt, updatedAt: c.updatedAt, updates: c.updates
    })) });
  } catch (err) {
    res.status(500).json({ message: "Could not load the complaint register." });
  }
});

// Simple admin endpoint. Keep ADMIN_KEY private and do not publish it in client-side code.
app.patch("/api/admin/complaints/:reference", async (req, res) => {
  const adminKey = process.env.ADMIN_KEY;
  if (!adminKey || req.get("x-admin-key") !== adminKey) {
    return res.status(401).json({ message: "Admin key is missing or invalid." });
  }
  const allowedStatuses = ["Submitted", "Under Review", "In Progress", "Resolved", "Closed"];
  const { status, note } = req.body;
  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ message: "Select a valid status." });
  }
  try {
    const complaint = await Complaint.findOne({ reference: String(req.params.reference).toUpperCase() });
    if (!complaint) return res.status(404).json({ message: "Complaint not found." });
    complaint.status = status;
    complaint.updates.push({
      status,
      note: String(note || "Status updated by the grievance team.").trim().slice(0, 500),
      updatedAt: new Date()
    });
    await complaint.save();
    res.json({ message: "Complaint status updated.", complaint: publicComplaint(complaint) });
  } catch (err) {
    res.status(500).json({ message: "Could not update the complaint." });
  }
});

const citizenPages = {
  "/submit": "submit.html",
  "/track": "track.html",
  "/activity": "activity.html",
  "/how-it-works": "how-it-works.html",
  "/help": "help.html"
};
for (const [route, file] of Object.entries(citizenPages)) {
  app.get(route, (_req, res) => res.sendFile(path.join(__dirname, "public", file)));
}

app.get("/admin", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

async function start() {
  try {
    if (!process.env.MONGODB_URI) {
      console.error("MONGODB_URI is missing. Copy .env.example to .env and configure it.");
      process.exit(1);
    }
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connected.");
    app.listen(PORT, () => console.log(`Public Grievance Assistant running at http://localhost:${PORT}`));
  } catch (err) {
    console.error("Could not connect to MongoDB:", err.message);
    process.exit(1);
  }
}
start();
