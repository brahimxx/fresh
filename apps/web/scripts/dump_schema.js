const fs = require('fs');
const { query } = require('../src/lib/db.js');

async function dump() {
  try {
    let output = '-- MySQL dump structure\n\nSET FOREIGN_KEY_CHECKS=0;\n\n';
    
    const tablesRes = await query('SHOW TABLES');
    const tableKeys = Object.keys(tablesRes[0]);
    const key = tableKeys[0]; // e.g. 'Tables_in_fresh'
    
    const tables = tablesRes.map(t => t[key]);
    
    for (const table of tables) {
      output += '-- Table structure for table `' + table + '`\n';
      output += 'DROP TABLE IF EXISTS `' + table + '`;\n';
      
      const createRes = await query('SHOW CREATE TABLE `' + table + '`');
      output += createRes[0]['Create Table'] + ';\n\n';
    }
    
    output += 'SET FOREIGN_KEY_CHECKS=1;\n';
    fs.writeFileSync('./database/fresh_structure.sql', output);
    console.log('Successfully wrote schema to database/fresh_structure.sql');
    
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}

dump();
