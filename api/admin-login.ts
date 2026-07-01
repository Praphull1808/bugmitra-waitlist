export default function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const provided = String(req.body?.passcode || '').trim();
  const expected = String(process.env.ADMIN_PASSCODE || '').trim();

  if (provided === expected) {
    return res.status(200).json({ success: true, message: 'Admin authentication successful.' });
  }

  return res.status(401).json({ success: false, message: 'Invalid passcode.' });
}