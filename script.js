// ------------------------------------
// CONFIGURACIÓN
// ------------------------------------
// URL pública del proxy en Railway
const PROXY_URL = "https://productosmondelez-production.up.railway.app";
const PRODUCTOS_URL = `${PROXY_URL}/api/productos`;
const MAX_RESULTS = 20;

// Marcas de más de una palabra (el resto se toma de la primera palabra del producto)
const MARCAS_COMPUESTAS = ["CLUB SOCIAL"];

const formatoPesos = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

let productos = [];
let fuse = null;

// ------------------------------------
// UTILIDADES
// ------------------------------------
function texto(value) {
    return value === undefined || value === null ? "" : String(value).trim();
}

function obtenerMarca(nombre) {
    const upper = nombre.toUpperCase();
    const compuesta = MARCAS_COMPUESTAS.find(m => upper === m || upper.startsWith(`${m} `));
    return compuesta || upper.split(/\s+/)[0] || "";
}

function mapProducto(row) {
    const nombre = texto(row.PRODUCTO);
    return {
        sap: texto(row.SAP),
        nombre,
        marca: obtenerMarca(nombre),
        unidadesDisplay: texto(row.UNIDADES_X_DISPLAY),
        displayCaja: texto(row.DISPLAY_X_CAJA),
        precioBase: row.PRECIO_BASE_IVA,
        pvp: row.PVP,
    };
}

// El backend responde { status, result: [...] }, pero aceptamos también un arreglo directo
function extractRows(data) {
    if (Array.isArray(data)) return data;
    if (data && typeof data === "object") {
        for (const key of ["result", "data", "results", "rows", "items"]) {
            if (Array.isArray(data[key])) return data[key];
        }
    }
    return [];
}

function precio(value) {
    const n = Number(value);
    return value === null || value === undefined || value === "" || Number.isNaN(n) ? "" : formatoPesos.format(n);
}

function escapeHtml(text) {
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function setStatus(html, type = "") {
    const status = document.getElementById("status");
    status.className = `status ${type}`.trim();
    status.innerHTML = html;
}

// ------------------------------------
// CARGA DE PRODUCTOS
// ------------------------------------
async function cargarProductos() {
    const searchInput = document.getElementById("searchInput");
    setStatus("Cargando productos...");

    try {
        const response = await fetch(PRODUCTOS_URL);
        const data = await response.json().catch(() => null);

        if (!response.ok) {
            throw new Error((data && data.error) || `Error ${response.status}`);
        }

        productos = extractRows(data).map(mapProducto).filter(p => p.nombre || p.sap);

        if (productos.length === 0) {
            searchInput.placeholder = "Sin productos";
            setStatus(`<span class="material-icons">info</span>De momento no hay productos disponibles.`, "empty");
            return;
        }

        fuse = new Fuse(productos, {
            keys: [
                { name: "nombre", weight: 0.7 },
                { name: "sap", weight: 0.3 },
            ],
            threshold: 0.35,
            ignoreLocation: true,
        });

        llenarFiltro();

        searchInput.disabled = false;
        searchInput.placeholder = "Buscar por producto o código SAP...";
        searchInput.focus();
        setStatus(`${productos.length} productos cargados.`);
    } catch (err) {
        console.error("❌ Error cargando productos:", err);
        searchInput.placeholder = "No se pudieron cargar los productos";
        setStatus(
            `<span class="material-icons">error_outline</span>No se pudieron cargar los productos. Intente de nuevo más tarde.`,
            "error"
        );
    }
}

// Selector de marca
function llenarFiltro() {
    const marcas = [...new Set(productos.map(p => p.marca).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es"));
    if (marcas.length < 2) return;

    const select = document.getElementById("filtroSelect");
    select.innerHTML = `<option value="">Todas las marcas</option>` +
        marcas.map(m => `<option value="${escapeHtml(m)}">${escapeHtml(m)}</option>`).join("");
    select.hidden = false;
}

// ------------------------------------
// BÚSQUEDA
// ------------------------------------
function handleInput() {
    const query = document.getElementById("searchInput").value.trim();
    const marca = document.getElementById("filtroSelect").value;
    const results = document.getElementById("results");

    if (!fuse) {
        results.innerHTML = "";
        return;
    }

    let found;
    if (query.length >= 2) {
        found = fuse.search(query).map(r => r.item);
    } else if (marca) {
        found = productos.slice();
    } else {
        results.innerHTML = "";
        return;
    }

    if (marca) found = found.filter(p => p.marca === marca);
    found = found.slice(0, MAX_RESULTS);

    if (found.length === 0) {
        const donde = query ? `"${escapeHtml(query)}"` : "esta marca";
        results.innerHTML = `<div class="status empty">No se encontraron resultados para ${donde}.</div>`;
        return;
    }

    results.innerHTML = found.map(renderProducto).join("");
}

function renderProducto(p, index) {
    const copyIcon = text =>
        `<span class="material-icons copy-icon" title="Copiar" data-copy="${escapeHtml(text)}" onclick="copyText(this)">content_copy</span>`;

    const item = (icon, label, value, copiable = false) =>
        value ? `<li><span class="material-icons icon-tipo">${icon}</span><strong>${label}:</strong> ${escapeHtml(value)}${copiable ? copyIcon(value) : ""}</li>` : "";

    const items = [
        item("tag", "SAP", p.sap, true),
        item("inventory_2", "Unidades x display", p.unidadesDisplay),
        item("all_inbox", "Display x caja", p.displayCaja),
        item("receipt_long", "Precio base + IVA", precio(p.precioBase)),
        item("payments", "PVP", precio(p.pvp)),
    ].join("");

    return `
        <div class="result-item producto" style="animation-delay: ${index * 0.03}s">
            <h3><span class="material-icons icon-tipo">shopping_bag</span>${escapeHtml(p.nombre || "Producto sin nombre")}</h3>
            ${p.marca ? `<div class="tags"><span class="tag">${escapeHtml(p.marca)}</span></div>` : ""}
            <ul>${items}</ul>
        </div>`;
}

function copyText(el) {
    const text = el.dataset.copy;
    navigator.clipboard.writeText(text).then(() => {
        el.textContent = "check";
        setTimeout(() => { el.textContent = "content_copy"; }, 1200);
    }).catch(err => console.error("No se pudo copiar:", err));
}

// ------------------------------------
// MODO OSCURO
// ------------------------------------
function toggleDarkMode() {
    const enabled = document.getElementById("darkModeToggle").checked;
    document.body.classList.toggle("dark-mode", enabled);
    document.getElementById("darkModeLabel").textContent = enabled ? "☀️ Modo claro" : "🌙 Modo oscuro";
    try { localStorage.setItem("darkMode", enabled ? "1" : "0"); } catch (e) { /* sin almacenamiento */ }
}

(function initDarkMode() {
    let saved = null;
    try { saved = localStorage.getItem("darkMode"); } catch (e) { /* sin almacenamiento */ }
    if (saved === "1") {
        document.getElementById("darkModeToggle").checked = true;
        toggleDarkMode();
    }
})();

cargarProductos();
