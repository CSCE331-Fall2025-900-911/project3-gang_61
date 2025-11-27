require("dotenv").config({ path: require("path").join(__dirname, "../backend/.env") });
const { Client } = require("pg");

(async () => {
  const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  try {
    await client.connect();
    const res = await client.query(
      `SELECT * FROM products ORDER BY product_id`
    );
    console.log(`\nFound ${res.rows.length} products:\n`);
    res.rows.forEach(row => {
      console.log(JSON.stringify(row, null, 2));
      console.log('---');
    });
  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    await client.end();
  }
})();