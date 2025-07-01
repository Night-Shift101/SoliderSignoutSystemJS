// populate-signouts.js
const Database = require('better-sqlite3');
const db = new Database('data/soldiers.db');

const soldiers = [
  { rank: 'PVT', first: 'John', last: 'Doe', dod: '1234567890' },
  { rank: 'SGT', first: 'Jane', last: 'Smith', dod: '2345678901' },
  { rank: 'CPL', first: 'Mike', last: 'Johnson', dod: '3456789012' },
  { rank: 'SPC', first: 'Sara', last: 'Brown', dod: '4567890123' },
  { rank: 'LT', first: 'Chris', last: 'Davis', dod: '5678901234' },
  { rank: 'SGT', first: 'Amy', last: 'Wilson', dod: '6789012345' },
  { rank: 'PFC', first: 'Tom', last: 'Lee', dod: '7890123456' },
  { rank: 'SSG', first: 'Emma', last: 'Clark', dod: '8901234567' },
  { rank: 'MSG', first: 'Ben', last: 'Hall', dod: '9012345678' },
  { rank: 'CPT', first: 'Nina', last: 'Adams', dod: '0123456789' },
];

const locations = ['Motor Pool', 'PX', 'Barracks', 'Gym', 'DFAC', 'Range'];
const commanders = [
  { id: 1, name: 'LT Miller' },
  { id: 10, name: 'SSG Lee' },
];

function randomDateWithinHours(hours) {
  const now = new Date();
  const past = new Date(now.getTime() - Math.random() * hours * 60 * 60 * 1000);
  return past.toISOString().slice(0, 19).replace('T', ' ');
}

function generateSignoutId(groupNumber) {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(2); // last two digits of year
  const mm = String(now.getMonth() + 1).padStart(2, '0'); // months are 0-indexed
  const dd = String(now.getDate()).padStart(2, '0');
  const groupId = String(1000 + groupNumber); // e.g., 1005, 1021, etc.

  return `SO${yy}${mm}${dd}-${groupId}`;
}

function createGroup(groupId, members, stillOut) {
  const signOutTime = randomDateWithinHours(stillOut ? 8 : 72);
  const signInTime = stillOut ? null : new Date(new Date(signOutTime).getTime() + Math.random() * 4 * 60 * 60 * 1000);
const outBy = commanders[Math.floor(Math.random() * commanders.length)];
    const inBy = stillOut ? { id: null, name: null } : commanders[Math.floor(Math.random() * commanders.length)];
    const location = locations[Math.floor(Math.random() * locations.length)];
  members.forEach(soldier => {
    
    db.prepare(`
      INSERT INTO signouts (
        signout_id, soldier_rank, soldier_first_name, soldier_last_name, soldier_dod_id,
        location, sign_out_time, sign_in_time, signed_out_by_id, signed_out_by_name,
        signed_in_by_id, signed_in_by_name, status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      groupId,
      soldier.rank,
      soldier.first,
      soldier.last,
      soldier.dod,
      location,
      signOutTime,
      signInTime ? signInTime.toISOString().slice(0, 19).replace('T', ' ') : null,
      outBy.id,
      outBy.name,
      inBy.id,
      inBy.name,
      stillOut ? 'OUT' : 'IN',
      'Filler test data'
    );
  });
}

// Create 20 groups
for (let i = 1; i <= 20; i++) {
const groupSize = Math.floor(Math.random() * 3) + 2; // 2–4 people
  const groupMembers = soldiers.sort(() => 0.5 - Math.random()).slice(0, groupSize);
  const groupId = generateSignoutId(i)
  const stillOut = i % 3 === 0; // every 3rd group is still out

  createGroup(groupId, groupMembers, stillOut);
}

console.log('Populated signouts with test data.');
