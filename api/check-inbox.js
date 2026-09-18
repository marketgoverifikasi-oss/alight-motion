const {
  handlePreflight, cors,
  emailnatorList, emailnatorGet,
  extractLinks, stripHtml,
} = require('./_lib');

module.exports = async (req, res) => {
  if (handlePreflight(req, res)) return;
  cors(res);

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { email } = req.body || {};
  if (!email) {
    return res.status(400).json({ success: false, error: 'Email wajib diisi' });
  }

  try {
    const list = await emailnatorList(email);
    if (list.status !== 'success') {
      return res.status(502).json({ success: false, error: 'Gagal ambil inbox' });
    }

    const messages = list.messages || [];
    if (messages.length === 0) {
      return res.status(200).json({ success: true, count: 0, messages: [] });
    }

    // Ambil detail pesan pertama (terbaru) saja biar cepat
    const first = messages[0];
    let detail = null;
    if (!first.locked) {
      try { detail = await emailnatorGet(first.id); } catch (e) {}
    }

    const rawContent = detail?.content || '';
    const plain = rawContent.includes('<') ? stripHtml(rawContent) : rawContent;
    const links = extractLinks(rawContent, plain);

    return res.status(200).json({
      success: true,
      count: messages.length,
      latest: {
        from: first.from || 'Tidak diketahui',
        subject: first.subject || '(Tanpa Subjek)',
        date: first.date || null,
        locked: !!first.locked,
        body: plain.substring(0, 1500),
        links,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
