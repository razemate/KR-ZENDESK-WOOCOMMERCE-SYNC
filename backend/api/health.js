export default function handler(req, res) {
  res.status(200).json({ ok: true, service: "kr-zendesk-woo-sync-backend" });
}
