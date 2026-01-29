export default function handler(req, res) {
  console.log("Health check");
  res.status(200).json({ ok: true, service: "kr-zendesk-woo-sync-backend", status: "healthy" });
}
