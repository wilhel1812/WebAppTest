const tableBody = document.getElementById("itemRows");
const rowTemplate = document.getElementById("rowTemplate");
const statusEl = document.getElementById("status");
const addRowBtn = document.getElementById("addRowBtn");
const downloadBtn = document.getElementById("downloadCsvBtn");
const emailForm = document.getElementById("emailForm");

function addRow(prefill = {}) {
  const row = rowTemplate.content.firstElementChild.cloneNode(true);
  row.querySelectorAll("input").forEach((input) => {
    if (prefill[input.name]) {
      input.value = prefill[input.name];
    }
  });

  row.querySelector(".remove-row").addEventListener("click", () => {
    row.remove();
    ensureHasRow();
  });

  tableBody.appendChild(row);
}

function ensureHasRow() {
  if (!tableBody.children.length) {
    addRow();
  }
}

function collectRows() {
  const rows = [];

  tableBody.querySelectorAll("tr").forEach((tr) => {
    const inputs = tr.querySelectorAll("input");
    const row = {};
    let hasValue = false;

    inputs.forEach((input) => {
      const value = input.value.trim();
      if (value) {
        hasValue = true;
      }
      row[input.name] = value;
    });

    if (hasValue) {
      rows.push(row);
    }
  });

  return rows;
}

function csvEscape(value = "") {
  const stringValue = String(value);
  const needsQuotes = /[",\n]/.test(stringValue);
  const escaped = stringValue.replace(/"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
}

function toCsv(rows) {
  const columns = [
    { key: "itemNumber", label: "Item Number" },
    { key: "country", label: "Country" },
    { key: "price", label: "Price" },
    { key: "date", label: "Date" }
  ];

  const header = columns.map((c) => c.label).join(",");
  const lines = rows.map((row) =>
    columns.map((column) => csvEscape(row[column.key] || "")).join(",")
  );

  return [header, ...lines].join("\n");
}

function updateStatus(message, type = "") {
  statusEl.textContent = message;
  statusEl.className = type ? type : "";
}

function downloadCsv(rows) {
  const csv = toCsv(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `items-${Date.now()}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

addRowBtn.addEventListener("click", () => {
  addRow();
});

downloadBtn.addEventListener("click", () => {
  const rows = collectRows();
  if (!rows.length) {
    updateStatus("Add at least one row before generating CSV.", "error");
    return;
  }

  downloadCsv(rows);
  updateStatus("CSV downloaded.", "success");
});

emailForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const rows = collectRows();

  if (!rows.length) {
    updateStatus("Add at least one row before sending.", "error");
    return;
  }

  const formData = new FormData(emailForm);
  const payload = {
    recipientEmail: formData.get("recipientEmail"),
    subject: formData.get("subject"),
    message: formData.get("message"),
    rows
  };

  updateStatus("Sending email…");
  const submitButton = emailForm.querySelector("button[type=submit]");
  submitButton.disabled = true;

  try {
    const response = await fetch("/api/send-csv", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || "Failed to send email.");
    }

    updateStatus("Email sent successfully!", "success");
    emailForm.reset();
  } catch (error) {
    console.error(error);
    updateStatus(error.message, "error");
  } finally {
    submitButton.disabled = false;
  }
});

ensureHasRow();
