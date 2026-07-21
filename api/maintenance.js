// /api/maintenance.js  — Vercel serverless function
// Safely updates data/system_config.json on GitHub using PAT stored as env var.
// The browser never sees the token — it's only in Vercel's environment.

export default async function handler(req, res) {
    // Allow CORS from same origin
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Master-Key');

    if (req.method === 'OPTIONS') return res.status(200).end();

    // ── GET: return current maintenance state ──────────────────
    if (req.method === 'GET') {
        try {
            const pat = process.env.GITHUB_PAT;
            const owner = process.env.GITHUB_OWNER || 'zeroandonetechsolution';
            const repo = process.env.GITHUB_REPO || 'houseofviyara1';

            const r = await fetch(
                `https://api.github.com/repos/${owner}/${repo}/contents/data/system_config.json?_=${Date.now()}`,
                {
                    headers: {
                        'Authorization': `token ${pat}`,
                        'Accept': 'application/vnd.github.v3+json',
                        'User-Agent': 'HouseOfViyara-MasterPanel'
                    }
                }
            );

            if (!r.ok) {
                return res.status(r.status).json({ error: `GitHub returned ${r.status}` });
            }

            const fileData = await r.json();
            const content = JSON.parse(Buffer.from(fileData.content, 'base64').toString('utf-8'));
            return res.status(200).json({ ...content, _sha: fileData.sha });

        } catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }

    // ── POST: update maintenance state ─────────────────────────
    if (req.method === 'POST') {
        const masterKey = req.headers['x-master-key'] || req.body?.master_key;
        const validKeys = (process.env.MASTER_PANEL_KEYS || 'mosakutty,DEV-MASTER-9999').split(',');

        if (!validKeys.includes(masterKey)) {
            return res.status(403).json({ error: 'Invalid master key' });
        }

        const { maintenance_mode, maintenance_title, maintenance_message, maintenance_estimated_time } = req.body;

        const configData = {
            maintenance_mode: Boolean(maintenance_mode),
            maintenance_title: maintenance_title || 'Site Under Maintenance',
            maintenance_message: maintenance_message || 'We are performing maintenance. Please check back soon.',
            maintenance_estimated_time: maintenance_estimated_time || '',
            system_status: maintenance_mode ? 'MAINTENANCE' : 'ONLINE',
            last_updated: new Date().toISOString()
        };

        try {
            const pat = process.env.GITHUB_PAT;
            const owner = process.env.GITHUB_OWNER || 'zeroandonetechsolution';
            const repo = process.env.GITHUB_REPO || 'houseofviyara1';
            const filePath = 'data/system_config.json';

            // Get current SHA
            const getRes = await fetch(
                `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
                {
                    headers: {
                        'Authorization': `token ${pat}`,
                        'Accept': 'application/vnd.github.v3+json',
                        'User-Agent': 'HouseOfViyara-MasterPanel'
                    }
                }
            );

            let sha = null;
            if (getRes.ok) {
                sha = (await getRes.json()).sha;
            }

            const content = Buffer.from(JSON.stringify(configData, null, 4)).toString('base64');

            const putRes = await fetch(
                `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
                {
                    method: 'PUT',
                    headers: {
                        'Authorization': `token ${pat}`,
                        'Content-Type': 'application/json',
                        'Accept': 'application/vnd.github.v3+json',
                        'User-Agent': 'HouseOfViyara-MasterPanel'
                    },
                    body: JSON.stringify({
                        message: maintenance_mode
                            ? 'chore(master): enable maintenance mode — site OFFLINE'
                            : 'chore(master): disable maintenance mode — site ONLINE',
                        content,
                        sha
                    })
                }
            );

            if (!putRes.ok) {
                const errBody = await putRes.json().catch(() => ({}));
                return res.status(putRes.status).json({
                    error: `GitHub error: ${putRes.status}`,
                    detail: errBody.message
                });
            }

            return res.status(200).json({
                success: true,
                maintenance_mode: configData.maintenance_mode,
                system_status: configData.system_status,
                last_updated: configData.last_updated
            });

        } catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
