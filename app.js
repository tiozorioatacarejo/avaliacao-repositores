const weights = {
  rupture: 0.4,
  fifo: 0.2,
  pricing: 0.15,
  organization: 0.1,
  offers: 0.15,
};

const organizationChecklist = [
  "Gôndola limpa",
  "Produtos alinhados",
  "Corredor limpo",
  "Sem caixas vazias",
  "Layout organizado",
];

const offersChecklist = [
  "Produto na área correta",
  "Cartaz correto",
  "Produto abastecido",
  "Ponta/ilha montada",
  "Comunicação visual correta",
];

const scoreLabels = {
  rupture: "Ruptura",
  fifo: "Validade/FIFO",
  pricing: "Precificação",
  organization: "Organização",
  offers: "Ofertas",
};

const form = document.querySelector("#evaluationForm");
const scoreCards = document.querySelector("#scoreCards");

function formatScore(value) {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function buildAuditRows(containerId, groupName, goodLabel, badLabel) {
  const container = document.querySelector(containerId);
  container.innerHTML = Array.from({ length: 10 }, (_, index) => {
    const item = index + 1;
    return `
      <div class="audit-row">
        <label class="audit-product">
          <span>Produto ${item}</span>
          <input type="text" name="${groupName}-product-${item}" placeholder="Nome do produto auditado">
        </label>
        <div class="segmented" role="radiogroup" aria-label="${groupName} item ${item}">
          <label>
            <input type="radio" name="${groupName}-${item}" value="good" checked>
            <span>${goodLabel}</span>
          </label>
          <label>
            <input type="radio" name="${groupName}-${item}" value="${groupName === "rupture" ? "rupture" : "bad"}">
            <span>${badLabel}</span>
          </label>
        </div>
      </div>
    `;
  }).join("");
}

function buildChecklist(containerId, groupName, items) {
  const container = document.querySelector(containerId);
  container.innerHTML = items.map((item, index) => `
    <label class="check-row">
      <input type="checkbox" name="${groupName}" value="${item}" checked>
      <span class="box" aria-hidden="true">✓</span>
      <span class="item-label">${item}</span>
    </label>
  `).join("");
}

function buildScoreCards() {
  scoreCards.innerHTML = Object.keys(scoreLabels).map((key) => `
    <article class="score-card">
      <span>${scoreLabels[key]}</span>
      <strong id="${key}CardScore">100,0</strong>
      <em id="${key}Weighted">Ponderado: ${formatScore(weights[key] * 100)}</em>
    </article>
  `).join("");
}

function countSelected(groupPrefix, value) {
  return Array.from(document.querySelectorAll(`input[name^="${groupPrefix}-"]:checked`))
    .filter((input) => input.value === value).length;
}

function checkedCount(groupName) {
  return document.querySelectorAll(`input[name="${groupName}"]:checked`).length;
}

function fifoScore(occurrences) {
  if (occurrences <= 0) return 100;
  if (occurrences === 1) return 80;
  if (occurrences === 2) return 60;
  if (occurrences === 3) return 30;
  return 0;
}

function classify(finalScore) {
  if (finalScore >= 95) return "Excelente";
  if (finalScore >= 85) return "Bom";
  if (finalScore >= 70) return "Atenção";
  return "Plano de ação";
}

function calculate() {
  const ruptureCount = countSelected("rupture", "rupture");
  const rupture = 100 - (ruptureCount / 10) * 100;
  const fifoOccurrences = Math.max(0, Number.parseInt(document.querySelector("#fifoOccurrences").value || "0", 10));
  const fifo = fifoScore(fifoOccurrences);
  const pricingCorrect = countSelected("pricing", "good");
  const pricing = (pricingCorrect / 10) * 100;
  const organization = checkedCount("organization") * 20;
  const offers = checkedCount("offers") * 20;

  const scores = { rupture, fifo, pricing, organization, offers };
  const weighted = Object.fromEntries(
    Object.entries(scores).map(([key, value]) => [key, value * weights[key]])
  );
  const finalScore = Object.values(weighted).reduce((sum, value) => sum + value, 0);
  const finalClass = classify(finalScore);

  updateUi(scores, weighted, finalScore, finalClass);
  return { scores, weighted, finalScore, finalClass, ruptureCount, fifoOccurrences, pricingCorrect };
}

function updateUi(scores, weighted, finalScore, finalClass) {
  Object.entries(scores).forEach(([key, value]) => {
    document.querySelector(`#${key}CardScore`).textContent = formatScore(value);
    document.querySelector(`#${key}Weighted`).textContent = `Ponderado: ${formatScore(weighted[key])}`;
  });

  document.querySelector("#ruptureScore").textContent = formatScore(scores.rupture);
  document.querySelector("#fifoScore").textContent = formatScore(scores.fifo);
  document.querySelector("#pricingScore").textContent = formatScore(scores.pricing);
  document.querySelector("#organizationScore").textContent = formatScore(scores.organization);
  document.querySelector("#offersScore").textContent = formatScore(scores.offers);
  document.querySelector("#finalScore").textContent = formatScore(finalScore);
  document.querySelector("#finalClass").textContent = finalClass;
}

function getFormData(results) {
  const field = (id) => document.querySelector(id).value.trim();
  const ruptureDetails = Array.from({ length: 10 }, (_, index) => {
    const item = index + 1;
    const value = document.querySelector(`input[name="rupture-${item}"]:checked`).value;
    return {
      product: field(`input[name="rupture-product-${item}"]`) || `Item ${item}`,
      status: value === "rupture" ? "Ruptura" : "OK",
    };
  });
  const pricingDetails = Array.from({ length: 10 }, (_, index) => {
    const item = index + 1;
    const value = document.querySelector(`input[name="pricing-${item}"]:checked`).value;
    return {
      product: field(`input[name="pricing-product-${item}"]`) || `Item ${item}`,
      status: value === "good" ? "Correto" : "Errado",
    };
  });

  return {
    date: field("#date"),
    stockerName: field("#stockerName"),
    sector: field("#sector"),
    auditor: field("#auditor"),
    ruptureDetails,
    pricingDetails,
    organizationDetails: organizationChecklist.map((item) => ({
      item,
      ok: Array.from(document.querySelectorAll('input[name="organization"]:checked')).some((input) => input.value === item),
    })),
    offersDetails: offersChecklist.map((item) => ({
      item,
      ok: Array.from(document.querySelectorAll('input[name="offers"]:checked')).some((input) => input.value === item),
    })),
    ...results,
  };
}

function worksheetRows(data) {
  const rows = [
    ["Avaliação de Performance de Repositores"],
    [],
    ["Data", data.date],
    ["Nome do repositor", data.stockerName],
    ["Setor", data.sector],
    ["Auditor", data.auditor],
    [],
    ["Resumo", "Peso", "Nota", "Resultado ponderado"],
    ["Ruptura", "40%", data.scores.rupture, data.weighted.rupture],
    ["Validade/FIFO", "20%", data.scores.fifo, data.weighted.fifo],
    ["Precificação", "15%", data.scores.pricing, data.weighted.pricing],
    ["Organização e limpeza", "10%", data.scores.organization, data.weighted.organization],
    ["Execução de ofertas", "15%", data.scores.offers, data.weighted.offers],
    ["Nota final", "", data.finalScore, data.finalClass],
    [],
    ["Ruptura - itens auditados"],
    ["Item", "Produto auditado", "Resultado"],
    ...data.ruptureDetails.map((entry, index) => [`Item ${index + 1}`, entry.product, entry.status]),
    [],
    ["Validade/FIFO"],
    ["Ocorrências", data.fifoOccurrences],
    [],
    ["Precificação - itens auditados"],
    ["Item", "Produto auditado", "Resultado"],
    ...data.pricingDetails.map((entry, index) => [`Item ${index + 1}`, entry.product, entry.status]),
    [],
    ["Organização e limpeza"],
    ["Item", "Status", "Pontos"],
    ...data.organizationDetails.map((entry) => [entry.item, entry.ok ? "OK" : "Não OK", entry.ok ? 20 : 0]),
    [],
    ["Execução de ofertas"],
    ["Item", "Status", "Pontos"],
    ...data.offersDetails.map((entry) => [entry.item, entry.ok ? "OK" : "Não OK", entry.ok ? 20 : 0]),
  ];
  return rows;
}

function xmlEscape(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function columnName(index) {
  let name = "";
  let number = index + 1;
  while (number > 0) {
    const remainder = (number - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    number = Math.floor((number - 1) / 26);
  }
  return name;
}

function sheetXml(rows) {
  const sheetData = rows.map((row, rowIndex) => {
    const cells = row.map((value, columnIndex) => {
      const reference = `${columnName(columnIndex)}${rowIndex + 1}`;
      if (typeof value === "number") {
        return `<c r="${reference}"><v>${value.toFixed(2)}</v></c>`;
      }
      return `<c r="${reference}" t="inlineStr"><is><t>${xmlEscape(value)}</t></is></c>`;
    }).join("");
    return `<row r="${rowIndex + 1}">${cells}</row>`;
  }).join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <cols>
    <col min="1" max="1" width="28" customWidth="1"/>
    <col min="2" max="4" width="20" customWidth="1"/>
  </cols>
  <sheetData>${sheetData}</sheetData>
</worksheet>`;
}

function workbookXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Avaliação" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`;
}

function contentTypesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`;
}

function rootRelsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`;
}

function workbookRelsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`;
}

function appXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>Performance Repositores</Application>
</Properties>`;
}

function coreXml() {
  const now = new Date().toISOString();
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>Avaliação de Performance de Repositores</dc:title>
  <dc:creator>Aplicação Web</dc:creator>
  <cp:lastModifiedBy>Aplicação Web</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified>
</cp:coreProperties>`;
}

function crc32(bytes) {
  let crc = -1;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ -1) >>> 0;
}

function writeString(bytes, value) {
  for (let index = 0; index < value.length; index += 1) {
    bytes.push(value.charCodeAt(index) & 0xff);
  }
}

function writeUint16(bytes, value) {
  bytes.push(value & 0xff, (value >>> 8) & 0xff);
}

function writeUint32(bytes, value) {
  bytes.push(value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff);
}

function createZip(files) {
  const encoder = new TextEncoder();
  const bytes = [];
  const centralDirectory = [];

  files.forEach((file) => {
    const nameBytes = encoder.encode(file.name);
    const dataBytes = encoder.encode(file.content);
    const offset = bytes.length;
    const checksum = crc32(dataBytes);

    writeUint32(bytes, 0x04034b50);
    writeUint16(bytes, 20);
    writeUint16(bytes, 0);
    writeUint16(bytes, 0);
    writeUint16(bytes, 0);
    writeUint16(bytes, 0);
    writeUint32(bytes, checksum);
    writeUint32(bytes, dataBytes.length);
    writeUint32(bytes, dataBytes.length);
    writeUint16(bytes, nameBytes.length);
    writeUint16(bytes, 0);
    bytes.push(...nameBytes, ...dataBytes);

    centralDirectory.push({ file, nameBytes, dataBytes, offset, checksum });
  });

  const centralOffset = bytes.length;
  centralDirectory.forEach((entry) => {
    writeUint32(bytes, 0x02014b50);
    writeUint16(bytes, 20);
    writeUint16(bytes, 20);
    writeUint16(bytes, 0);
    writeUint16(bytes, 0);
    writeUint16(bytes, 0);
    writeUint16(bytes, 0);
    writeUint32(bytes, entry.checksum);
    writeUint32(bytes, entry.dataBytes.length);
    writeUint32(bytes, entry.dataBytes.length);
    writeUint16(bytes, entry.nameBytes.length);
    writeUint16(bytes, 0);
    writeUint16(bytes, 0);
    writeUint16(bytes, 0);
    writeUint16(bytes, 0);
    writeUint32(bytes, 0);
    writeUint32(bytes, entry.offset);
    bytes.push(...entry.nameBytes);
  });
  const centralSize = bytes.length - centralOffset;

  writeUint32(bytes, 0x06054b50);
  writeUint16(bytes, 0);
  writeUint16(bytes, 0);
  writeUint16(bytes, files.length);
  writeUint16(bytes, files.length);
  writeUint32(bytes, centralSize);
  writeUint32(bytes, centralOffset);
  writeUint16(bytes, 0);

  return new Blob([new Uint8Array(bytes)], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

function createWorkbook(data) {
  const files = [
    { name: "[Content_Types].xml", content: contentTypesXml() },
    { name: "_rels/.rels", content: rootRelsXml() },
    { name: "docProps/app.xml", content: appXml() },
    { name: "docProps/core.xml", content: coreXml() },
    { name: "xl/workbook.xml", content: workbookXml() },
    { name: "xl/_rels/workbook.xml.rels", content: workbookRelsXml() },
    { name: "xl/worksheets/sheet1.xml", content: sheetXml(worksheetRows(data)) },
  ];
  return createZip(files);
}

function downloadWorkbook(data) {
  const blob = createWorkbook(data);
  const url = URL.createObjectURL(blob);
  const safeName = (data.stockerName || "repositor").normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  const link = document.createElement("a");
  link.href = url;
  link.download = `avaliacao-repositor-${safeName || "sem-nome"}-${data.date || getToday()}.xlsx`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function init() {
  document.querySelector("#date").value = getToday();
  buildAuditRows("#ruptureItems", "rupture", "OK", "Ruptura");
  buildAuditRows("#pricingItems", "pricing", "Correto", "Errado");
  buildChecklist("#organizationItems", "organization", organizationChecklist);
  buildChecklist("#offersItems", "offers", offersChecklist);
  buildScoreCards();
  calculate();
}

form.addEventListener("input", calculate);
form.addEventListener("change", calculate);
form.addEventListener("reset", () => {
  window.setTimeout(() => {
    document.querySelector("#date").value = getToday();
    calculate();
  }, 0);
});
form.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  const results = calculate();
  const data = getFormData(results);
  downloadWorkbook(data);
});

init();
