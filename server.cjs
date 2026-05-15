const http = require("http");
const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");

const root = __dirname;
loadEnvFile(path.join(root, ".env"));

const port = Number(process.env.PORT || 5502);
const host = process.env.HOST || "0.0.0.0";
const databasePath = path.join(root, "database.json");
const supabaseUrl = normalizeSupabaseUrl(process.env.SUPABASE_URL);
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLIC_ANON_KEY || "";
const supabaseTable = process.env.SUPABASE_TABLE || "sales_app_data";

const defaultDatabase = {
  appState: null,
  appStateUpdatedAt: null,
  users: [],
  usersUpdatedAt: null,
};

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

const server = http.createServer(async (request, response) => {
  try {
    const requestPath = new URL(request.url, `http://${host}:${port}`).pathname;

    if (requestPath.startsWith("/api/")) {
      await handleApi(request, response, requestPath);
      return;
    }

    serveStaticFile(requestPath, response);
  } catch (error) {
    sendJson(response, 500, { error: "server_error", message: error.message });
  }
});

function loadEnvFile(envPath) {
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator).trim();
    const rawValue = trimmed.slice(separator + 1).trim();
    const value = rawValue.replace(/^["']|["']$/g, "");
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function normalizeSupabaseUrl(value) {
  return String(value || "")
    .trim()
    .replace(/\/+$/, "")
    .replace(/\/rest\/v1$/i, "");
}

async function handleApi(request, response, requestPath) {
  if (request.method === "GET" && requestPath === "/api/health") {
    sendJson(response, 200, {
      ok: true,
      database: isSupabaseConfigured() ? "supabase" : "local-file",
      table: isSupabaseConfigured() ? supabaseTable : null,
    });
    return;
  }

  if (request.method === "GET" && requestPath === "/api/public-config") {
    sendJson(response, 200, {
      supabaseUrl,
      supabaseAnonKey,
      googleAuthEnabled: Boolean(supabaseUrl && supabaseAnonKey),
    });
    return;
  }

  if (request.method === "GET" && requestPath === "/api/state") {
    const database = await readDatabase();
    sendJson(response, 200, {
      state: database.appState,
      updatedAt: database.appStateUpdatedAt,
    });
    return;
  }

  if (request.method === "PUT" && requestPath === "/api/state") {
    const body = await readJsonBody(request);
    const database = await readDatabase();
    database.appState = normalizeStateBody(body.state);
    database.appStateUpdatedAt = body.updatedAt || new Date().toISOString();
    await writeDatabase(database);
    sendJson(response, 200, { ok: true, updatedAt: database.appStateUpdatedAt });
    return;
  }

  if (request.method === "GET" && requestPath === "/api/users") {
    const database = await readDatabase();
    sendJson(response, 200, {
      users: Array.isArray(database.users) ? database.users : [],
      updatedAt: database.usersUpdatedAt,
    });
    return;
  }

  if (request.method === "PUT" && requestPath === "/api/users") {
    const body = await readJsonBody(request);
    if (!Array.isArray(body.users)) {
      sendJson(response, 400, { error: "invalid_users" });
      return;
    }

    const database = await readDatabase();
    database.users = body.users;
    database.usersUpdatedAt = body.updatedAt || new Date().toISOString();
    await writeDatabase(database);
    sendJson(response, 200, { ok: true, updatedAt: database.usersUpdatedAt });
    return;
  }

  sendJson(response, 404, { error: "not_found" });
}

function serveStaticFile(requestPath, response) {
  const url = requestPath === "/" ? "/index.html" : decodeURIComponent(requestPath);
  const filePath = path.normalize(path.join(root, url));

  if (!filePath.startsWith(root)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }

    response.writeHead(200, {
      "Content-Type": types[path.extname(filePath)] || "text/plain; charset=utf-8",
    });
    response.end(data);
  });
}

async function readDatabase() {
  if (isSupabaseConfigured()) {
    try {
      return await readSupabaseDatabase();
    } catch (error) {
      console.warn(`Supabase read failed, using local fallback: ${error.message}`);
    }
  }

  return readFileDatabase();
}

async function writeDatabase(database) {
  if (isSupabaseConfigured()) {
    try {
      await writeSupabaseDatabase(database);
      return;
    } catch (error) {
      console.warn(`Supabase write failed, using local fallback: ${error.message}`);
    }
  }

  await writeFileDatabase(database);
}

async function readFileDatabase() {
  try {
    const raw = await fsp.readFile(databasePath, "utf8");
    return { ...defaultDatabase, ...JSON.parse(raw) };
  } catch (error) {
    if (error.code === "ENOENT") return { ...defaultDatabase };
    throw error;
  }
}

async function writeFileDatabase(database) {
  const nextDatabase = { ...defaultDatabase, ...database };
  const tempPath = `${databasePath}.tmp`;
  await fsp.writeFile(tempPath, JSON.stringify(nextDatabase, null, 2), "utf8");
  await fsp.rename(tempPath, databasePath);
}

function isSupabaseConfigured() {
  return Boolean(supabaseUrl && supabaseKey);
}

async function readSupabaseDatabase() {
  const [stateRow, usersRow] = await Promise.all([
    readSupabaseRecord("app_state"),
    readSupabaseRecord("users"),
  ]);

  return {
    appState: stateRow?.value || null,
    appStateUpdatedAt: stateRow?.updated_at || null,
    users: Array.isArray(usersRow?.value) ? usersRow.value : [],
    usersUpdatedAt: usersRow?.updated_at || null,
  };
}

async function writeSupabaseDatabase(database) {
  await Promise.all([
    writeSupabaseRecord(
      "app_state",
      normalizeStateBody(database.appState),
      database.appStateUpdatedAt || new Date().toISOString()
    ),
    writeSupabaseRecord(
      "users",
      Array.isArray(database.users) ? database.users : [],
      database.usersUpdatedAt || new Date().toISOString()
    ),
  ]);
}

async function readSupabaseRecord(id) {
  const url = `${supabaseUrl}/rest/v1/${encodeURIComponent(supabaseTable)}?select=id,value,updated_at&id=eq.${encodeURIComponent(id)}&limit=1`;
  const response = await fetch(url, {
    headers: supabaseHeaders(),
  });

  if (!response.ok) {
    throw new Error(`read ${response.status}: ${await response.text()}`);
  }

  const rows = await response.json();
  return Array.isArray(rows) ? rows[0] : null;
}

async function writeSupabaseRecord(id, value, updatedAt) {
  const url = `${supabaseUrl}/rest/v1/${encodeURIComponent(supabaseTable)}?on_conflict=id`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      ...supabaseHeaders(),
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify({
      id,
      value,
      updated_at: updatedAt,
    }),
  });

  if (!response.ok) {
    throw new Error(`write ${response.status}: ${await response.text()}`);
  }
}

function supabaseHeaders() {
  return {
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`,
    Accept: "application/json",
  };
}

function normalizeStateBody(state) {
  const fallback = { orders: [], products: [], purchases: [], customerTransactions: [], customerDebts: [] };
  if (!state || typeof state !== "object") return fallback;

  return {
    ...fallback,
    ...state,
    orders: Array.isArray(state.orders) ? state.orders : [],
    products: Array.isArray(state.products) ? state.products : [],
    purchases: Array.isArray(state.purchases) ? state.purchases : [],
    customerTransactions: Array.isArray(state.customerTransactions) ? state.customerTransactions : [],
    customerDebts: Array.isArray(state.customerDebts) ? state.customerDebts : [],
  };
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";

    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 5_000_000) {
        request.destroy();
        reject(new Error("Request body is too large"));
      }
    });

    request.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });

    request.on("error", reject);
  });
}

function sendJson(response, statusCode, data) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(data));
}

server.listen(port, host, () => {
  console.log(`Sales app running at http://${host}:${port}`);
  console.log(isSupabaseConfigured()
    ? `Online database: Supabase table "${supabaseTable}"`
    : `Database file: ${databasePath}`);
});
