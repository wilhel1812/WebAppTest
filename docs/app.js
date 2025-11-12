document.addEventListener("DOMContentLoaded", () => {
  const tableBody = document.getElementById("itemRows");
  const statusEl = document.getElementById("status");
  const addRowBtn = document.getElementById("addRowBtn");
  const downloadBtn = document.getElementById("downloadCsvBtn");

  if (!tableBody || !addRowBtn || !downloadBtn) {
    console.error("UI is missing required elements. Check index.html for matching IDs.");
    return;
  }

  const COUNTRY_OPTIONS = ["NOR", "SVE", "FIN"];
  const LIFECYCLE_OPTIONS = ["ZA", "ZI", "ZD", "ZP", "ZC"];

  const FIELD_DEFS = [
    {
      name: "itemNumber",
      type: "text",
      placeholder: "1234567",
      attributes: {
        inputmode: "numeric",
        pattern: "\\d{7}",
        maxlength: "7",
        title: "Enter exactly 7 digits"
      }
    },
    {
      name: "country",
      component: "select",
      options: COUNTRY_OPTIONS
    },
    {
      name: "newPrice",
      type: "number",
      placeholder: "0.00",
      attributes: { min: "0", step: "0.01" }
    },
    {
      name: "productLifecycle",
      component: "select",
      options: LIFECYCLE_OPTIONS,
      required: false
    },
    { name: "activationDate", type: "date" }
  ];

  const REQUIRED_FIELDS = FIELD_DEFS.filter((def) => def.required !== false).map((def) => def.name);
  const ITEM_NUMBER_PATTERN = /^\d{7}$/;

  function updateStatus(message, type = "") {
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.className = type ? type : "";
  }

  function createFieldElement(def) {
    const isRequired = def.required !== false;

    if (def.component === "select") {
      const select = document.createElement("select");
      select.name = def.name;
      select.required = isRequired;

      const placeholderOption = document.createElement("option");
      placeholderOption.value = "";
      placeholderOption.textContent = isRequired ? "Select" : "Optional";
      placeholderOption.disabled = isRequired;
      placeholderOption.selected = true;
      select.appendChild(placeholderOption);

      def.options.forEach((value) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = value;
        select.appendChild(option);
      });

      return select;
    }

    const input = document.createElement("input");
    input.type = def.type || "text";
    input.name = def.name;
    input.placeholder = def.placeholder || "";
    input.required = isRequired;
    if (def.attributes) {
      Object.entries(def.attributes).forEach(([key, value]) => {
        input.setAttribute(key, value);
      });
    }
    return input;
  }

  function buildInputCell(def) {
    const cell = document.createElement("td");
    const field = createFieldElement(def);
    field.dataset.field = def.name;
    cell.appendChild(field);
    return cell;
  }

  function buildRemoveCell(row) {
    const cell = document.createElement("td");
    cell.className = "row-actions";

    const button = document.createElement("button");
    button.type = "button";
    button.className = "remove-row";
    button.setAttribute("aria-label", "Remove row");
    button.textContent = "×";
    button.addEventListener("click", () => {
      row.remove();
      ensureHasRow();
    });

    cell.appendChild(button);
    return cell;
  }

  function buildKeyCell() {
    const cell = document.createElement("td");
    cell.className = "key-cell";
    const value = document.createElement("span");
    value.className = "key-value";
    value.textContent = "—";
    cell.appendChild(value);
    return cell;
  }

  function computeKey(country = "", itemNumber = "") {
    if (!country || !itemNumber) return "";
    return `${country}${itemNumber}`;
  }

  function updateKeyPreview(row) {
    const keyDisplay = row.querySelector(".key-value");
    if (!keyDisplay) return;
    const country = row.querySelector('[data-field="country"]')?.value.trim();
    const itemNumber = row.querySelector('[data-field="itemNumber"]')?.value.trim();
    const key = computeKey(country, itemNumber);
    keyDisplay.textContent = key || "—";
  }

  function attachKeyListeners(row) {
    const itemField = row.querySelector('[data-field="itemNumber"]');
    const countryField = row.querySelector('[data-field="country"]');
    if (itemField) {
      itemField.addEventListener("input", () => updateKeyPreview(row));
    }
    if (countryField) {
      countryField.addEventListener("change", () => updateKeyPreview(row));
    }
    updateKeyPreview(row);
  }

  function addRow(prefill = {}) {
    const row = document.createElement("tr");

    FIELD_DEFS.forEach((def) => {
      const cell = buildInputCell(def);
      const field = cell.querySelector("[data-field]");
      if (prefill[def.name]) {
        field.value = prefill[def.name];
        if (def.component === "select") {
          field.dispatchEvent(new Event("change"));
        }
      }
      row.appendChild(cell);
    });

    row.appendChild(buildKeyCell());
    row.appendChild(buildRemoveCell(row));
    attachKeyListeners(row);
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
      const inputs = tr.querySelectorAll("[data-field]");
      const row = {};
      let hasValue = false;

      inputs.forEach((input) => {
        const value = input.value.trim();
        if (value) {
          hasValue = true;
        }
        row[input.dataset.field || input.name] = value;
      });

      row.key = computeKey(row.country, row.itemNumber);

      if (hasValue) {
        rows.push(row);
      }
    });

    return rows;
  }

  function validateRows(rows) {
    if (!rows.length) {
      return "Add at least one row before generating CSV.";
    }

    for (const row of rows) {
      for (const fieldName of REQUIRED_FIELDS) {
        if (!row[fieldName]) {
          return "Fill out all fields before downloading.";
        }
      }

      if (!ITEM_NUMBER_PATTERN.test(row.itemNumber)) {
        return "Item Number must be exactly 7 digits.";
      }

      if (!COUNTRY_OPTIONS.includes(row.country)) {
        return "Select a valid country (NOR, SVE, FIN).";
      }

      if (row.productLifecycle && !LIFECYCLE_OPTIONS.includes(row.productLifecycle)) {
        return "Select a valid product lifecycle (ZA, ZI, ZD, ZP, ZC).";
      }
    }

    return "";
  }

  function csvEscape(value = "") {
    const stringValue = String(value);
    const needsQuotes = /[\";\n]/.test(stringValue);
    const escaped = stringValue.replace(/"/g, '""');
    return needsQuotes ? `"${escaped}"` : escaped;
  }

  function toCsv(rows) {
    const columns = [
      { key: "itemNumber", label: "ITEM NUMBER" },
      { key: "country", label: "COUNTRY" },
      { key: "newPrice", label: "NEW PRICE" },
      { key: "productLifecycle", label: "NEW PRODUCT LIFECYCLE" },
      { key: "activationDate", label: "ACTIVATION DATE" },
      { key: "key", label: "KEY" }
    ];

    const header = columns.map((c) => c.label).join(";");
    const lines = rows.map((row) =>
      columns.map((column) => csvEscape(row[column.key] || "")).join(";")
    );

    return [header, ...lines].join("\n");
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

  addRowBtn.addEventListener("click", () => addRow());

  downloadBtn.addEventListener("click", () => {
    const rows = collectRows();
    const validationError = validateRows(rows);
    if (validationError) {
      updateStatus(validationError, "error");
      return;
    }

    downloadCsv(rows);
    updateStatus("CSV downloaded.", "success");
  });

  ensureHasRow();
});
