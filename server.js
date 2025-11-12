"use strict";

const path = require("path");
const express = require("express");
const nodemailer = require("nodemailer");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

const requiredMailSettings = ["MAIL_HOST", "MAIL_PORT", "MAIL_USER", "MAIL_PASS", "MAIL_FROM"];

function ensureMailConfig() {
  const missing = requiredMailSettings.filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(`Missing email configuration env vars: ${missing.join(", ")}`);
  }
}

function createTransport() {
  ensureMailConfig();
  return nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: Number(process.env.MAIL_PORT) || 587,
    secure: process.env.MAIL_SECURE === "true" || Number(process.env.MAIL_PORT) === 465,
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS
    }
  });
}

function csvEscape(value) {
  if (value === null || value === undefined) return "";
  const stringValue = String(value).trim();
  const needsQuoting = /[",\n]/.test(stringValue);
  const escaped = stringValue.replace(/"/g, '""');
  return needsQuoting ? `"${escaped}"` : escaped;
}

function buildCsv(rows = []) {
  const columns = [
    { key: "itemNumber", label: "Item Number" },
    { key: "country", label: "Country" },
    { key: "price", label: "Price" },
    { key: "date", label: "Date" }
  ];

  const header = columns.map((c) => c.label).join(",");
  const body = rows
    .map((row) =>
      columns
        .map((column) => csvEscape(row[column.key] ?? ""))
        .join(",")
    )
    .join("\n");

  return `${header}\n${body}`.trim() + "\n";
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/send-csv", async (req, res) => {
  const { rows, recipientEmail, subject, message } = req.body || {};

  if (!Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ error: "At least one row is required." });
  }

  if (!recipientEmail) {
    return res.status(400).json({ error: "Recipient email is required." });
  }

  try {
    const csvPayload = buildCsv(rows);
    const transporter = createTransport();

    await transporter.sendMail({
      from: process.env.MAIL_FROM,
      to: recipientEmail,
      subject: subject || "CSV Export",
      text: message || "Attached is the CSV export you requested.",
      attachments: [
        {
          filename: `items-${Date.now()}.csv`,
          content: csvPayload
        }
      ]
    });

    res.json({ ok: true });
  } catch (error) {
    console.error("Failed to send CSV email", error);
    res.status(500).json({ error: "Unable to send email. Check server logs for details." });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
