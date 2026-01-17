const manifestPath = "data/manifest.json";

const state = {
  manifest: null,
  rows: [],
  activePlatforms: new Set(),
  activeTopics: new Set(),
  query: "",
};

const elements = {
  monthSelect: document.getElementById("monthSelect"),
  searchInput: document.getElementById("searchInput"),
  platformFilters: document.getElementById("platformFilters"),
  topicFilters: document.getElementById("topicFilters"),
  cardList: document.getElementById("cardList"),
  lastUpdated: document.getElementById("last-updated"),
  recordCount: document.getElementById("record-count"),
};

function escapeHTML(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

function splitTags(value) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === "\"" && next === "\"") {
        field += "\"";
        i += 1;
      } else if (char === "\"") {
        inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === "\"") {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      if (row.some((cell) => cell.trim() !== "")) {
        rows.push(row);
      }
      row = [];
      field = "";
    } else if (char === "\r") {
      continue;
    } else {
      field += char;
    }
  }

  if (field.length || row.length) {
    row.push(field);
    if (row.some((cell) => cell.trim() !== "")) {
      rows.push(row);
    }
  }

  return rows;
}

function resolveColumns(headers) {
  const map = (label, fallback) => {
    const index = headers.indexOf(label);
    return index === -1 ? fallback : index;
  };

  return {
    date: map("日時", 0),
    name: map("名称", 1),
    pf: map("PF", 2),
    topic: map("トピック", 3),
    origin: map("起源", 4),
    background: map("背景", 5),
    impact: map("影響", 6),
  };
}

function toRecords(rows) {
  if (!rows.length) {
    return [];
  }

  const headers = rows[0].map((cell) => cell.trim());
  const columns = resolveColumns(headers);

  return rows.slice(1).map((cols, index) => ({
    id: `${cols[columns.date]}-${index}`,
    date: cols[columns.date] ?? "",
    name: cols[columns.name] ?? "",
    platforms: splitTags(cols[columns.pf] ?? ""),
    topics: splitTags(cols[columns.topic] ?? ""),
    origin: cols[columns.origin] ?? "",
    background: cols[columns.background] ?? "",
    impact: cols[columns.impact] ?? "",
  }));
}

function uniqueTags(records, key) {
  const set = new Set();
  records.forEach((record) => {
    record[key].forEach((item) => set.add(item));
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b, "ja"));
}

function buildChips(container, items, activeSet, scope) {
  container.innerHTML = "";

  const reset = document.createElement("button");
  reset.type = "button";
  reset.className = "chip";
  reset.textContent = "すべて";
  reset.dataset.scope = scope;
  reset.addEventListener("click", () => {
    activeSet.clear();
    updateFilters();
  });
  container.appendChild(reset);

  items.forEach((item) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip";
    chip.textContent = item;
    chip.dataset.value = item;
    chip.dataset.scope = scope;
    chip.addEventListener("click", () => {
      if (activeSet.has(item)) {
        activeSet.delete(item);
      } else {
        activeSet.add(item);
      }
      updateFilters();
    });
    container.appendChild(chip);
  });
}

function updateChipStates() {
  document.querySelectorAll(".chip").forEach((chip) => {
    const scope = chip.dataset.scope;
    const value = chip.dataset.value;
    if (!value) {
      if (scope === "platform") {
        chip.classList.toggle("is-active", state.activePlatforms.size === 0);
      } else if (scope === "topic") {
        chip.classList.toggle("is-active", state.activeTopics.size === 0);
      }
      return;
    }

    if (scope === "platform") {
      chip.classList.toggle("is-active", state.activePlatforms.has(value));
    } else if (scope === "topic") {
      chip.classList.toggle("is-active", state.activeTopics.has(value));
    }
  });
}

function applyFilters() {
  const query = state.query.trim().toLowerCase();
  const hasPlatformFilter = state.activePlatforms.size > 0;
  const hasTopicFilter = state.activeTopics.size > 0;

  return state.rows.filter((record) => {
    const matchesQuery = !query
      ? true
      : [record.name, record.origin, record.background, record.impact]
          .join(" ")
          .toLowerCase()
          .includes(query);

    const matchesPlatform = !hasPlatformFilter
      ? true
      : record.platforms.some((pf) => state.activePlatforms.has(pf));

    const matchesTopic = !hasTopicFilter
      ? true
      : record.topics.some((topic) => state.activeTopics.has(topic));

    return matchesQuery && matchesPlatform && matchesTopic;
  });
}

function renderCards(records) {
  elements.cardList.innerHTML = "";

  records.forEach((record) => {
    const card = document.createElement("article");
    card.className = "card";
    card.innerHTML = `
      <div class="date">${escapeHTML(record.date)}</div>
      <h3>${escapeHTML(record.name)}</h3>
      <div class="tag-row">
        ${record.platforms
          .map((pf) => `<span class="tag">${escapeHTML(pf)}</span>`)
          .join("")}
      </div>
      <div class="tag-row">
        ${record.topics
          .map((topic) => `<span class="tag topic">${escapeHTML(topic)}</span>`)
          .join("")}
      </div>
      <p><span class="label">起源</span> ${escapeHTML(record.origin)}</p>
      <p><span class="label">背景</span> ${escapeHTML(record.background)}</p>
      <p><span class="label">影響</span> ${escapeHTML(record.impact)}</p>
    `;
    elements.cardList.appendChild(card);
  });

  elements.recordCount.textContent = `Records: ${records.length}`;
}

function updateFilters() {
  updateChipStates();
  renderCards(applyFilters());
}

async function loadMonth(path) {
  const response = await fetch(path);
  const text = await response.text();
  const rows = parseCSV(text);
  state.rows = toRecords(rows).sort((a, b) => b.date.localeCompare(a.date));

  buildChips(
    elements.platformFilters,
    uniqueTags(state.rows, "platforms"),
    state.activePlatforms,
    "platform"
  );
  buildChips(
    elements.topicFilters,
    uniqueTags(state.rows, "topics"),
    state.activeTopics,
    "topic"
  );

  state.activePlatforms.clear();
  state.activeTopics.clear();
  updateFilters();
}

async function init() {
  const response = await fetch(manifestPath);
  state.manifest = await response.json();

  elements.lastUpdated.textContent = `Updated: ${state.manifest.updated}`;

  const files = state.manifest.files ?? [];
  files.forEach((file) => {
    const option = document.createElement("option");
    option.value = file.path;
    option.textContent = file.month;
    elements.monthSelect.appendChild(option);
  });

  const defaultFile =
    files.find((file) => file.month === state.manifest.defaultMonth) || files[0];

  if (defaultFile) {
    elements.monthSelect.value = defaultFile.path;
    await loadMonth(defaultFile.path);
  }

  elements.monthSelect.addEventListener("change", async (event) => {
    await loadMonth(event.target.value);
  });

  elements.searchInput.addEventListener("input", (event) => {
    state.query = event.target.value;
    updateFilters();
  });
}

init();
