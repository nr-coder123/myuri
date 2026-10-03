require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, SlashCommandBuilder, Events } = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const items = [
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

const RARITY_CONFIG = {
  Mortal: { color: 0x95a5a6, title: '? Mortal Grade (80%)', badge: '??' },
  Earth: { color: 0x3498db, title: '?? Earth Grade (15%)', badge: '??' },
  Heaven: { color: 0xf1c40f, title: '?? Heaven Grade (5%)', badge: '??' }
};

function rollRarity() {
  const roll = Math.random() * 100;
  if (roll < 80) return 'Mortal';
  if (roll < 95) return 'Earth';
  return 'Heaven';
}

client.once(Events.ClientReady, async (c) => {
  console.log(`[MURIM BOT] Online as ${c.user.tag}`);
  const command = new SlashCommandBuilder()
    .setName('maroll')
    .setDescription('Roll for a Murim technique or treasure!');
  try {
    await c.application.commands.set([command]);
    console.log('[MURIM BOT] /maroll registered.');
  } catch (err) {
    console.error(err);
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand() || interaction.commandName !== 'maroll') return;

  const rarity = rollRarity();
  const config = RARITY_CONFIG[rarity];
  const pool = items.filter(i => i.rarity.toLowerCase() === rarity.toLowerCase());
  const selected = pool[Math.floor(Math.random() * pool.length)];

  const embed = new EmbedBuilder()
    .setColor(config.color)
    .setTitle(`${config.badge} Martial Arts Fate Roll`)
    .setDescription(
      `Cultivator <@${interaction.user.id}> has communed with the Heavens!\n\n` +
      `**Grade:** ${config.title}\n` +
      `**Roll Number:** \`#${selected.id}\`\n` +
      `**Item Obtained:** **${selected.name}**`
    )
    .setFooter({ text: 'Murim Gacha System • Keep cultivating!' })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
});

client.login(process.env.DISCORD_TOKEN);
