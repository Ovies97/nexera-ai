// Disable Babylon offline DB caching (can cause partial cached GLBs)
BABYLON.Database.IDBStorageEnabled = false;

// Safety: never use HTTP range requests (can cause partial binary issues in some setups)
if (BABYLON.GLTFLoaderDefaultOptions) {
    BABYLON.GLTFLoaderDefaultOptions.useRangeRequests = false;
  }
  

const BACKEND_BASE = "http://localhost:8000";

const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);
engine.enableOfflineSupport = false;

const scene = new BABYLON.Scene(engine);

// Force Babylon to use fetch() (avoids XHR truncation issues)
BABYLON.FileTools.SetCorsBehavior("anonymous", url => url);

BABYLON.FileTools.LoadFile = function (
  url,
  onSuccess,
  onProgress,
  offlineProvider,
  useArrayBuffer,
  onError
) {
  fetch(url, { cache: "no-store" })
    .then(async (r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      if (useArrayBuffer) {
        const buf = await r.arrayBuffer();
        onSuccess(buf);
      } else {
        const text = await r.text();
        onSuccess(text);
      }
    })
    .catch((e) => {
      if (onError) onError(e);
      else console.error("LoadFile fetch error:", e);
    });
};


scene.clearColor = new BABYLON.Color4(0.01, 0.02, 0.06, 1);

// Camera
const camera = new BABYLON.ArcRotateCamera(
  "camera",
  Math.PI / 2,
  Math.PI / 2.4,
  4,
  BABYLON.Vector3.Zero(),
  scene
);
camera.attachControl(canvas, true);

// Light
new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);

// Ground (helps confirm scene is alive)
const ground = BABYLON.MeshBuilder.CreateGround("ground", { width: 6, height: 6 }, scene);
ground.position.y = 0;

// Render loop
engine.runRenderLoop(() => scene.render());
window.addEventListener("resize", () => engine.resize());

/* ===============================
   MODEL LOADING
================================ */

let currentRoot = null;

function clearModel() {
  if (currentRoot) {
    currentRoot.dispose();
    currentRoot = null;
  }
}

function frameRoot(root) {
    // Bounds in world space
    const bounds = root.getHierarchyBoundingVectors(true);
    const min = bounds.min;
    const max = bounds.max;
  
    const size = max.subtract(min);
    const center = min.add(size.scale(0.5));
  
    // Move model so its center is at origin
    root.position.subtractInPlace(center);
  
    // Largest dimension of the model
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
  
    // Put it nicely in view (tweak multiplier if you want more/less space)
    const fitRadius = maxDim * 1.8;
  
    // Look slightly DOWN so model appears lower on screen
    camera.target = new BABYLON.Vector3(
    0,
    -maxDim * 0.45, // 🔥 TUNE THIS VALUE
    0
    );
  
  camera.radius = fitRadius;
  
  
    // Nice viewing angle
    camera.alpha = Math.PI / 2;
    camera.beta = Math.PI / 2.2;
  
    // Zoom limits
    camera.lowerRadiusLimit = maxDim * 0.6;
    camera.upperRadiusLimit = maxDim * 10;
  
    // Clipping planes (helps big models)
    camera.minZ = Math.max(0.01, maxDim / 1000);
    camera.maxZ = maxDim * 50;
  
    // Smooth zoom feel (optional)
    camera.wheelDeltaPercentage = 0.01;
  }
  

let currentBlobUrl = null;

async function loadModel(modelPathFromApi) {
    console.log("📦 Loading model:", modelPathFromApi);
  
    clearModel();
  
    const networkUrl = `${BACKEND_BASE}${modelPathFromApi}?v=${Date.now()}`;
    console.log("🌐 Network URL:", networkUrl);
  
    try {
      const r = await fetch(networkUrl, { cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
  
      const ab = await r.arrayBuffer();
      console.log("✅ Fetched bytes:", ab.byteLength);
  
      // ✅ Key trick: wrap the bytes as a File so Babylon uses FileReader (not XHR)
      const file = new File([ab], "asset.glb", { type: "model/gltf-binary" });
  
      // rootUrl = "file:" and sceneFilename = File object
      const result = await BABYLON.SceneLoader.ImportMeshAsync(
        "",
        "file:",
        file,
        scene,
        undefined,
        ".glb" // force glb loader
      );
  
      const meshes = result.meshes || [];
      console.log("✅ Imported meshes:", meshes.length, meshes.map(m => m.name));
  
      if (meshes.length === 0) {
        console.warn("No meshes imported.");
        return;
      }
  
      const root = new BABYLON.TransformNode("root", scene);
      meshes.forEach((m) => {
        if (m.name === "ground" || m.name === "__root__") return;
        m.parent = root;
      });
  
      frameRoot(root);
  
      currentRoot = root;
      console.log("✅ Model placed & framed");
    } catch (err) {
      console.error("❌ Model load failed:", err);
      alert("Model failed to load. See console.");
    }
  }
  
  

/* ===============================
   GENERATE BUTTON
================================ */

const generateBtn = document.getElementById("generateBtn");
const summaryText = document.getElementById("summaryText");

generateBtn.addEventListener("click", async () => {
  const prompt = document.getElementById("promptInput").value.trim();
  const file = document.getElementById("fileInput").files[0];

  if (!prompt && !file) {
    alert("Type a prompt or choose a file.");
    return;
  }

  generateBtn.disabled = true;
  const oldText = generateBtn.innerText;
  generateBtn.innerText = "Generating...";
  if (summaryText) summaryText.innerText = "Generating educational summary...";

  const formData = new FormData();
  if (prompt) formData.append("prompt", prompt);
  if (file) formData.append("file", file);

  try {
    const res = await fetch(`${BACKEND_BASE}/generate-3D`, {
      method: "POST",
      body: formData
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Backend error ${res.status}: ${errText}`);
    }

    const data = await res.json();
    console.log("🧠 Backend response:", data);

    if (summaryText) summaryText.innerText = data.explanation || "No explanation returned.";
    loadModel(data.model_url);

  } catch (err) {
    console.error(err);
    alert("Generation failed. Check console + backend logs.");
    if (summaryText) summaryText.innerText = "Generation failed.";
  } finally {
    generateBtn.disabled = false;
    generateBtn.innerText = oldText;
  }
});


/* ===============================
   ✅ ADDED: TABS (3D / AVATAR)
   (does not change your 3D code)
================================ */

const tab3d = document.getElementById("tab3d");
const tabAvatar = document.getElementById("tabAvatar");
const panel3d = document.getElementById("panel3d");
const panelAvatar = document.getElementById("panelAvatar");

// Make it safe even if you haven't added tabs yet
function setTab(mode) {
  if (!tab3d || !tabAvatar || !panel3d || !panelAvatar) return;

  const is3d = mode === "3d";

  tab3d.classList.toggle("active", is3d);
  tabAvatar.classList.toggle("active", !is3d);

  panel3d.style.display = is3d ? "block" : "none";
  panelAvatar.style.display = is3d ? "none" : "block";

  // Optional: clear summary when switching
  // if (summaryText) summaryText.innerText = "";
}

if (tab3d) tab3d.addEventListener("click", () => setTab("3d"));
if (tabAvatar) tabAvatar.addEventListener("click", () => setTab("avatar"));


/* ===============================
   ✅ ADDED: AVATAR COMMANDS (TEST 2)
   - Loads avatar once
   - Calls backend AI to interpret command
   - Maps to animation clips
   - Plays animation sequence
================================ */

// Put your avatar glb here in frontend: /assets/avatar.glb
// (Must contain animations: idle, walk, wave, point, pose etc.)
const AVATAR_URL = "/assets/avatar.glb";

let avatarRoot = null;
let avatarAnim = {};     // lowercased name -> AnimationGroup
let currentAvatarAnim = null;

function stopCurrentAvatarAnim() {
  if (currentAvatarAnim) {
    try { currentAvatarAnim.stop(); } catch (_) {}
    currentAvatarAnim = null;
  }
}

function playAvatarAnim(name, loop=false, speed=1.0) {
  const key = (name || "").toLowerCase();
  const group = avatarAnim[key];

  if (!group) {
    console.warn("❗ Missing animation:", key, "available:", Object.keys(avatarAnim));
    return false;
  }

  stopCurrentAvatarAnim();

  currentAvatarAnim = group;
  currentAvatarAnim.reset();
  currentAvatarAnim.speedRatio = speed;

  // start(loop, speedRatio, from, to, isAdditive)
  currentAvatarAnim.start(loop, speed, currentAvatarAnim.from, currentAvatarAnim.to, false);
  return true;
}

function frameAvatar() {
  // Camera for avatar demo
  camera.target = new BABYLON.Vector3(0, 1, 0);
  camera.radius = 3.2;
  camera.alpha = Math.PI / 2;
  camera.beta = Math.PI / 2.1;

  camera.lowerRadiusLimit = 1.5;
  camera.upperRadiusLimit = 8;
  camera.wheelDeltaPercentage = 0.01;
}

async function loadAvatarOnce() {
  if (avatarRoot) return;

  console.log("🧍 Loading avatar:", AVATAR_URL);

  // Keep your 3D model if you want, but for the avatar tab usually you clear it
  // clearModel();

  const result = await BABYLON.SceneLoader.ImportMeshAsync("", "", AVATAR_URL, scene);

  avatarRoot = new BABYLON.TransformNode("avatarRoot", scene);

  // Parent imported meshes
  result.meshes.forEach(m => {
    if (m.name === "__root__") return;
    m.parent = avatarRoot;
  });

  // Register animations
  (result.animationGroups || []).forEach(g => {
    avatarAnim[g.name.toLowerCase()] = g;
  });

  console.log("🎞️ Avatar animations:", Object.keys(avatarAnim));

  // Default position (in front of camera)
  avatarRoot.position = new BABYLON.Vector3(0, 0, 0);

  frameAvatar();

  // Start idle loop if available
  if (avatarAnim["idle"]) playAvatarAnim("idle", true);
}

function mapIntentToSequence(intent) {
  // Prefer AI-provided steps
  if (intent && Array.isArray(intent.steps) && intent.steps.length) {
    return intent.steps.map(s => String(s).toLowerCase());
  }

  const action = String(intent?.action || "idle").toLowerCase();

  if (action === "walk") return ["walk", "idle"];
  if (action === "wave") return ["wave", "idle"];
  if (action === "point") return ["point", "idle"];
  if (action === "pose") return ["pose", "idle"];

  return ["idle"];
}

function resolveAnimName(name) {
  const key = (name || "").toLowerCase();
  if (avatarAnim[key]) return key;

  // common Mixamo naming variations
  if (key === "walk" && avatarAnim["walking"]) return "walking";
  if (key === "idle" && avatarAnim["breathing idle"]) return "breathing idle";
  if (key === "wave" && avatarAnim["waving"]) return "waving";
  if (key === "point" && avatarAnim["pointing"]) return "pointing";

  return null;
}

async function runAvatarCommand(command) {
  await loadAvatarOnce();

  const res = await fetch(`${BACKEND_BASE}/interpret-command`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ command })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`interpret-command failed: ${res.status} ${errText}`);
  }

  const intent = await res.json();
  console.log("🧠 Avatar intent:", intent);

  if (summaryText) summaryText.innerText = intent.explanation || "";

  const seq = mapIntentToSequence(intent);

  // Play each step in sequence
  for (const step of seq) {
    const resolved = resolveAnimName(step);
    if (!resolved) continue;

    const ok = playAvatarAnim(resolved, false, 1.0);
    if (!ok) continue;

    // Estimate duration from frames (approx)
    const g = avatarAnim[resolved];
    const frames = (g.to - g.from) || 60;
    const fps = 30;
    const ms = Math.max(700, (frames / fps) * 1000);

    await new Promise(r => setTimeout(r, ms));
  }

  // End in idle loop
  if (resolveAnimName("idle")) playAvatarAnim(resolveAnimName("idle"), true);
}


/* ===============================
   ✅ ADDED: AVATAR UI WIRING
================================ */

const runCommandBtn = document.getElementById("runCommandBtn");
const commandInput = document.getElementById("commandInput");

if (runCommandBtn) {
  runCommandBtn.addEventListener("click", async () => {
    const cmd = (commandInput?.value || "").trim();
    if (!cmd) {
      alert('Type a command like: "Wave hello to the learner"');
      return;
    }

    runCommandBtn.disabled = true;
    const old = runCommandBtn.innerText;
    runCommandBtn.innerText = "Running...";

    try {
      await runAvatarCommand(cmd);
    } catch (err) {
      console.error(err);
      alert("Command failed. Check console + backend logs.");
    } finally {
      runCommandBtn.disabled = false;
      runCommandBtn.innerText = old;
    }
  });
}
