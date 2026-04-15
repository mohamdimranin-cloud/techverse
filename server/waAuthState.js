const { pool } = require('./db')
const { initAuthCreds, BufferJSON, proto } = require('@whiskeysockets/baileys')

async function dbGet(key) {
  const { rows } = await pool.query('SELECT value FROM whatsapp_session WHERE key=$1', [key])
  if (!rows[0]) return null
  try { return JSON.parse(rows[0].value, BufferJSON.reviver) } catch { return null }
}

async function dbSet(key, value) {
  const json = JSON.stringify(value, BufferJSON.replacer)
  await pool.query(
    `INSERT INTO whatsapp_session (key, value, updated_at) VALUES ($1,$2,NOW())
     ON CONFLICT (key) DO UPDATE SET value=$2, updated_at=NOW()`,
    [key, json]
  )
}

async function dbDel(key) {
  await pool.query('DELETE FROM whatsapp_session WHERE key=$1', [key])
}

async function useDBAuthState() {
  let creds = await dbGet('creds')
  if (!creds) creds = initAuthCreds()

  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const data = {}
          await Promise.all(ids.map(async id => {
            const val = await dbGet(`${type}-${id}`)
            if (val) {
              data[id] = type === 'app-state-sync-key'
                ? proto.Message.AppStateSyncKeyData.fromObject(val)
                : val
            }
          }))
          return data
        },
        set: async (data) => {
          const tasks = []
          for (const category of Object.keys(data)) {
            for (const id of Object.keys(data[category])) {
              const val = data[category][id]
              const key = `${category}-${id}`
              tasks.push(val ? dbSet(key, val) : dbDel(key))
            }
          }
          await Promise.all(tasks)
        },
      },
    },
    saveCreds: async () => {
      await dbSet('creds', creds)
    },
  }
}

module.exports = { useDBAuthState }
