require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  SlashCommandBuilder,
  Events
} = require('discord.js');

// ==========================================
// 1. IN-MEMORY DATABASE & STORAGE SYSTEM
// ==========================================
const DATA_FILE = path.join(__dirname, 'items.json');

const DEFAULT_ITEMS = [
  { id: 1, name: "Basic Iron Fist Manual", rarity: "Mortal" },
  { id: 2, name: "Chipped Wooden Sword", rarity: "Mortal" },
  { id: 3, name: "Low-Grade Spirit Grass", rarity: "Mortal" },
  { id: 4, name: "Damaged Straw Sandals", rarity: "Mortal" },
  { id: 5, name: "Diluted Healing Salve", rarity: "Mortal" },
  { id: 6, name: "Novice Meditation Scroll", rarity: "Mortal" },
  { id: 7, name: "Rusted Throwing Dagger", rarity: "Mortal" },
  { id: 8, name: "Cracked Jade Pendant", rarity: "Mortal" },
  { id: 9, name: "Cloth Martial Robe", rarity: "Mortal" },
  { id: 10, name: "Bamboo Water Gourd", rarity: "Mortal" },
  { id: 11, name: "Boar Skin Bracers", rarity: "Mortal" },
  { id: 12, name: "Coarse Breath Control Guide", rarity: "Mortal" },
  { id: 13, name: "Refined Qi Gathering Pill", rarity: "Earth" },
  { id: 14, name: "Azure Cloud Step Scroll", rarity: "Earth" },
  { id: 15, name: "Cold Iron Dao Saber", rarity: "Earth" },
  { id: 16, name: "Hundred-Year Ginseng", rarity: "Earth" },
  { id: 17, name: "Serpent Scale Armor", rarity: "Earth" },
  { id: 18, name: "Nine Heavenly Dragons Scripture", rarity: "Heaven" },
  { id: 19, name: "Immortal Cleansing Divine Elixir", rarity: "Heaven" },
  { id: 20, name: "Primordial Void Sword", rarity: "Heaven" }
];

// Live In-Memory Cache
let memoryItems = [];

// Load data into memory
function loadItemsFromDisk() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf8');
      memoryItems = JSON.parse(raw);
      console.log(`[DATABASE] Loaded ${memoryItems.length} items from items.json into memory.`);
    } else {
      memoryItems = [...DEFAULT_ITEMS];
      saveItemsToDisk(memoryItems);
      console.log(`[DATABASE] items.json created with ${memoryItems.length} default items.`);
    }
  } catch (err) {
    console.error('[DATABASE] Error reading items.json, using defaults:', err);
    memoryItems = [...DEFAULT_ITEMS];
  }
}

// Save data from memory to disk
function saveItemsToDisk(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
    memoryItems = data;
    return true;
  } catch (err) {
    console.error('[DATABASE] Failed to write items.json:', err);
    return false;
  }
}

loadItemsFromDisk();

// ==========================================
// 2. DISCORD BOT CONFIGURATION & LOGIC
// ==========================================
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const RARITY_CONFIG = {
  Mortal: { color: 0x95a5a6, title: 'Mortal Grade (80%)' },
  Earth: { color: 0x3498db, title: 'Earth Grade (15%)' },
  Heaven: { color: 0xf1c40f, title: 'Heaven Grade (5%)' }
};

function rollRarity() {
  const roll = Math.random() * 100;
  if (roll < 80) return 'Mortal';
  if (roll < 95) return 'Earth';
  return 'Heaven';
}

client.once(Events.ClientReady, async (c) => {
  console.log(`[DISCORD] Bot online as ${c.user.tag}`);
  const command = new SlashCommandBuilder()
    .setName('maroll')
    .setDescription('Roll for a Murim technique or treasure!');

  try {
    await c.application.commands.set([command]);
    console.log('[DISCORD] /maroll slash command registered.');
  } catch (err) {
    console.error('[DISCORD] Slash command registration error:', err);
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand() || interaction.commandName !== 'maroll') return;

  const rarity = rollRarity();
  const config = RARITY_CONFIG[rarity];

  // Roll from the in-memory array
  const pool = memoryItems.filter(i => i.rarity.toLowerCase() === rarity.toLowerCase());

  if (pool.length === 0) {
    await interaction.reply({
      content: `Rolled **${rarity}**, but there are currently no items configured under this grade.`,
      ephemeral: true
    });
    return;
  }

  const selected = pool[Math.floor(Math.random() * pool.length)];

  // Clean Embed without emojis or footer
  const embed = new EmbedBuilder()
    .setColor(config.color)
    .setTitle('Martial Arts Roll')
    .setDescription(
      `Cultivator <@${interaction.user.id}> has communed with the Heavens!\n\n` +
      `**Grade:** ${config.title}\n` +
      `**Roll Number:** #${selected.id}\n` +
      `**Item Obtained:** **${selected.name}**`
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
});

if (process.env.DISCORD_TOKEN) {
  client.login(process.env.DISCORD_TOKEN);
} else {
  console.warn('[WARNING] No DISCORD_TOKEN provided in environment variables.');
}

// ==========================================
// 3. WEB DASHBOARD (Local & Render Ready)
// ==========================================
const app = express();
app.use(express.json());

// API Endpoints for Dashboard
app.get('/api/items', (req, res) => {
  res.json(memoryItems);
});

app.post('/api/items', (req, res) => {
  const newItems = req.body;
  if (!Array.isArray(newItems)) {
    return res.status(400).json({ error: 'Payload must be an array of items.' });
  }

  // Validate format
  for (const item of newItems) {
    if (!item.id || !item.name || !item.rarity) {
      return res.status(400).json({ error: 'Each item must have an id, name, and rarity.' });
    }
  }

  const saved = saveItemsToDisk(newItems);
  if (saved) {
    res.json({ success: true, message: 'Saved to memory and disk successfully!', items: memoryItems });
  } else {
    res.status(500).json({ error: 'Failed to write items to disk.' });
  }
});

// Single-Page Dashboard Interface
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Murim Bot Dashboard</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body { background: #121316; color: #e1e1e6; margin: 0; padding: 20px; }
    .container { max-width: 900px; margin: 0 auto; }
    h1 { margin-bottom: 8px; color: #fff; }
    p { color: #8a8d98; margin-top: 0; }
    .toolbar { display: flex; gap: 10px; margin: 20px 0; flex-wrap: wrap; }
    button { background: #2f80ed; color: white; border: none; padding: 10px 18px; border-radius: 6px; font-weight: 600; cursor: pointer; transition: 0.2s; }
    button:hover { background: #1b6cd9; }
    button.save { background: #27ae60; }
    button.save:hover { background: #219653; }
    button.secondary { background: #262930; color: #c4c7d0; border: 1px solid #3e424b; }
    button.secondary:hover { background: #323640; }
    button.delete { background: #eb5757; padding: 6px 12px; font-size: 13px; }
    table { width: 100%; border-collapse: collapse; background: #1a1c22; border-radius: 8px; overflow: hidden; margin-top: 15px; }
    th, td { padding: 12px 16px; text-align: left; border-bottom: 1px solid #262930; }
    th { background: #20232a; color: #9da1b0; font-size: 13px; text-transform: uppercase; }
    input, select { background: #262930; border: 1px solid #3e424b; color: white; padding: 8px 12px; border-radius: 5px; width: 100%; }
    .stats { display: flex; gap: 15px; margin-bottom: 20px; }
    .stat-card { background: #1a1c22; padding: 15px 20px; border-radius: 8px; flex: 1; border: 1px solid #262930; }
    .stat-title { font-size: 12px; color: #8a8d98; text-transform: uppercase; }
    .stat-value { font-size: 24px; font-weight: bold; margin-top: 5px; }
    #statusMsg { margin-top: 10px; font-size: 14px; font-weight: 500; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Murim Bot - Martial Arts Dashboard</h1>
    <p>Manage in-memory items, drop tables, and edit rarity pools in real time.</p>

    <div class="stats">
      <div class="stat-card">
        <div class="stat-title">Total Numbers / Items</div>
        <div class="stat-value" id="totalCount">0</div>
      </div>
      <div class="stat-card">
        <div class="stat-title">Mortal (80%)</div>
        <div class="stat-value" id="mortalCount">0</div>
      </div>
      <div class="stat-card">
        <div class="stat-title">Earth (15%)</div>
        <div class="stat-value" id="earthCount">0</div>
      </div>
      <div class="stat-card">
        <div class="stat-title">Heaven (5%)</div>
        <div class="stat-value" id="heavenCount">0</div>
      </div>
    </div>

    <div class="toolbar">
      <button onclick="addNewRow()">+ Add New Number</button>
      <button class="save" onclick="saveToServer()">Save Changes to Bot</button>
      <button class="secondary" onclick="exportJSON()">Export Backup (JSON)</button>
      <button class="secondary" onclick="document.getElementById('importFile').click()">Load from File</button>
      <input type="file" id="importFile" style="display:none" onchange="importJSON(event)" accept=".json">
    </div>

    <div id="statusMsg"></div>

    <table>
      <thead>
        <tr>
          <th style="width: 15%;">Roll Number (ID)</th>
          <th style="width: 50%;">Item / Technique Name</th>
          <th style="width: 25%;">Rarity Grade</th>
          <th style="width: 10%;">Actions</th>
        </tr>
      </thead>
      <tbody id="tableBody"></tbody>
    </table>
  </div>

  <script>
    let localItems = [];

    async function loadData() {
      const res = await fetch('/api/items');
      localItems = await res.json();
      render();
    }

    function render() {
      const tbody = document.getElementById('tableBody');
      tbody.innerHTML = '';

      let mortal = 0, earth = 0, heaven = 0;

      localItems.forEach((item, index) => {
        if (item.rarity === 'Mortal') mortal++;
        if (item.rarity === 'Earth') earth++;
        if (item.rarity === 'Heaven') heaven++;

        const tr = document.createElement('tr');
        tr.innerHTML = \`
          <td><input type="number" value="\${item.id}" onchange="updateItem(\${index}, 'id', Number(this.value))"></td>
          <td><input type="text" value="\${item.name}" onchange="updateItem(\${index}, 'name', this.value)"></td>
          <td>
            <select onchange="updateItem(\${index}, 'rarity', this.value)">
              <option value="Mortal" \${item.rarity === 'Mortal' ? 'selected' : ''}>Mortal (80%)</option>
              <option value="Earth" \${item.rarity === 'Earth' ? 'selected' : ''}>Earth (15%)</option>
              <option value="Heaven" \${item.rarity === 'Heaven' ? 'selected' : ''}>Heaven (5%)</option>
            </select>
          </td>
          <td><button class="delete" onclick="deleteRow(\${index})">Delete</button></td>
        \`;
        tbody.appendChild(tr);
      });

      document.getElementById('totalCount').innerText = localItems.length;
      document.getElementById('mortalCount').innerText = mortal;
      document.getElementById('earthCount').innerText = earth;
      document.getElementById('heavenCount').innerText = heaven;
    }

    function updateItem(index, key, value) {
      localItems[index][key] = value;
    }

    function addNewRow() {
      const nextId = localItems.length > 0 ? Math.max(...localItems.map(i => i.id || 0)) + 1 : 1;
      localItems.push({ id: nextId, name: "New Martial Manual", rarity: "Mortal" });
      render();
    }

    function deleteRow(index) {
      localItems.splice(index, 1);
      render();
    }

    async function saveToServer() {
      const msg = document.getElementById('statusMsg');
      msg.style.color = '#f1c40f';
      msg.innerText = 'Saving to bot...';

      try {
        const res = await fetch('/api/items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(localItems)
        });
        const data = await res.json();
        if (res.ok) {
          msg.style.color = '#27ae60';
          msg.innerText = 'Successfully saved to server memory and items.json!';
        } else {
          msg.style.color = '#eb5757';
          msg.innerText = 'Error: ' + data.error;
        }
      } catch (err) {
        msg.style.color = '#eb5757';
        msg.innerText = 'Failed to connect to the server.';
      }
    }

    function exportJSON() {
      const blob = new Blob([JSON.stringify(localItems, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'murim-items-backup.json';
      a.click();
    }

    function importJSON(event) {
      const reader = new FileReader();
      reader.onload = function(e) {
        try {
          const parsed = JSON.parse(e.target.result);
          if (Array.isArray(parsed)) {
            localItems = parsed;
            render();
            document.getElementById('statusMsg').style.color = '#27ae60';
            document.getElementById('statusMsg').innerText = 'Backup loaded! Click "Save Changes to Bot" to apply.';
          } else {
            alert('Invalid JSON file format.');
          }
        } catch (err) {
          alert('Failed to parse JSON file.');
        }
      };
      reader.readAsText(event.target.files[0]);
    }

    loadData();
  </script>
</body>
</html>
  `);
});

// Start Web Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`[DASHBOARD] Web Dashboard running on port ${PORT}`);
});
