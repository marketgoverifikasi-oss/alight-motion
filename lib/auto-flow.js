// ============================================================
//  AUTO FLOW — Helpers untuk batch auto-create (max 20 akun)
// ============================================================
const tempMail = require('./temp-mail');   // ✅ tetap ./ karena sama folder

const MAX_BATCH = 20;

function clampBatch(n) {
  n = parseInt(n) || MAX_BATCH;
  if (n < 1) n = 1;
  if (n > MAX_BATCH) n = MAX_BATCH;
  return n;
}

async function createTempEmail(opts = {}) {
  const acc = await tempMail.generateEmail(opts.username, opts.domain);
  if (!acc.status) throw new Error('Gagal generate email temp.');
  return acc;
}

async function pollInboxOnce(email, knownIds = []) {
  const inbox = await tempMail.getInbox(email, { limit: 20 });
  const messages = inbox.messages || [];
  const knownSet = new Set(knownIds.map(String));
  const newMsgs = messages.filter(m => !knownSet.has(String(m.mail_id)));

  if (!newMsgs.length) {
    return {
      hasNew: false,
      messages: [],
      knownIds: messages.map(m => m.mail_id)
    };
  }

  const details = await Promise.all(
    newMsgs.map(async (msg) => {
      try {
        return await tempMail.getMail(email, msg.mail_id);
      } catch {
        return msg;
      }
    })
  );

  return {
    hasNew: true,
    messages: details,
    knownIds: messages.map(m => m.mail_id)
  };
}

function findMagicLink(mails) {
  if (!Array.isArray(mails)) return null;
  for (const mail of mails) {
    const candidates = [mail.html, mail.text, mail.from_mail, mail.subject].filter(Boolean);
    for (const content of candidates) {
      const urls = content.match(/https?:\/\/[^\s"'<>)]+/gi) || [];
      for (const u of urls) {
        const cleaned = u.replace(/&amp;/g, '&');
        if (
          /oobCode=/.test(cleaned) ||
          /alightcreative\.com/.test(cleaned) ||
          /identitytoolkit/.test(cleaned) ||
          /firebaseapp\.com/.test(cleaned)
        ) {
          return { magicLink: cleaned, mail };
        }
      }
    }
  }
  return null;
}

module.exports = {
  createTempEmail,
  pollInboxOnce,
  findMagicLink,
  clampBatch,
  MAX_BATCH
};