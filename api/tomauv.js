// Serverless Function para Vercel en Node.js moderno (sin dependencias obsoletas de PHP)
// Permite consultar indiceuv.cl sin problemas de CORS
module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');

    const region = req.query.region || "7";
    const url = `https://indiceuv.cl/ws/wsIndiceUVREST.php?id_region=${region}`;

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3500);

        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
            }
        });
        clearTimeout(timeout);

        if (response.ok) {
            const data = await response.json();
            if (data && data.data && data.data[0] && data.data[0].max_diaria !== undefined) {
                return res.status(200).json(data);
            }
        }
    } catch (e) {
        // indiceuv.cl caído, timeout o no disponible
    }

    return res.status(503).json({
        error: "indiceuv.cl no disponible o temporalmente caido",
        data: []
    });
};
