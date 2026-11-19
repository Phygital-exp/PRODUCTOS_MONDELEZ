const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");
const app = express();

const PORT = process.env.PORT || 3000;
const { API_TOKEN, ALLOWED_ORIGINS } = process.env;
const PRODUCTOS_ENDPOINT_URL = "https://botai.smartdataautomation.com/api_backend_ai/dinamic-db/report/119/productos_mondelez";

if (!API_TOKEN) {
    console.error("❌ Falta la variable de entorno API_TOKEN");
    process.exit(1);
}

const AUTH_HEADERS = {
    Authorization: `Token ${API_TOKEN}`,
    "Content-Type": "application/json",
};

// CORS: si ALLOWED_ORIGINS está definido (separado por comas), solo esos orígenes; si no, todos.
// Ejemplo: ALLOWED_ORIGINS=https://phygital-exp.github.io
const origins = (ALLOWED_ORIGINS || "").split(",").map((o) => o.trim()).filter(Boolean);
app.use(cors(origins.length ? { origin: origins } : {}));

// Health check para Railway
app.get("/", (req, res) => {
    res.json({ status: "ok" });
});

// Productos Mondelez: /api/productos (los query params se reenvían al backend)
app.get("/api/productos", async (req, res) => {
    const params = new URLSearchParams(req.query).toString();
    const url = params ? `${PRODUCTOS_ENDPOINT_URL}?${params}` : PRODUCTOS_ENDPOINT_URL;

    try {
        const response = await fetch(url, { headers: AUTH_HEADERS });

        // Si el backend responde 404 lo tratamos como "sin productos"
        if (response.status === 404) {
            return res.json([]);
        }

        if (!response.ok) {
            const text = await response.text();
            console.error(`❌ Error HTTP ${response.status}:`, text);
            return res.status(response.status).json({ error: `Error ${response.status}: ${text.substring(0, 200)}` });
        }

        const data = await response.json();
        res.json(data ?? []);
    } catch (err) {
        console.error("❌ Error en el proxy:", err);
        res.status(500).json({ error: "Error al obtener los productos", details: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor proxy escuchando en http://localhost:${PORT}`);
});
