const axios = require('axios');
const db = require('../database/db');
const jwt = require('jsonwebtoken');

// Passo 1: Redirecionar o usuário para o provedor SSO
const redirectToSso = (req, res) => {
    // O 'state' é uma medida de segurança crucial contra CSRF
    const state = 'xyz123abc'; // Em produção, deveria ser um valor aleatório e único por sessão

    const params = new URLSearchParams({
        response_type: 'code',
        client_id: process.env.SSO_CLIENT_ID,
        redirect_uri: process.env.APP_REDIRECT_URI,
        scope: 'openid profile email',
        state: state,
    });

    const redirectUrl = `${process.env.SSO_AUTHORIZE_URL}?${params.toString()}`;
    
    // Enviamos a URL de volta para o frontend, que fará o redirecionamento
    res.json({ redirectUrl });
};

// Passo 3 e 4: Lidar com o callback do SSO
const handleSsoCallback = async (req, res) => {
    const { code, state } = req.query;

    // Validar o 'state'
    if (state !== 'xyz123abc') {
        return res.status(403).send('Estado inválido. Possível ataque CSRF.');
    }

    try {
        // Passo 4: Trocar o código por um access_token
        const tokenResponse = await axios.post(process.env.SSO_TOKEN_URL, new URLSearchParams({
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: process.env.APP_REDIRECT_URI,
            client_id: process.env.SSO_CLIENT_ID,
            client_secret: process.env.SSO_CLIENT_SECRET,
        }), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        const accessToken = tokenResponse.data.access_token;

        // Passo 5: Usar o access_token para obter informações do usuário
        const userResponse = await axios.get(process.env.SSO_USERINFO_URL, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        const ssoUser = userResponse.data;

        // Verificar se o usuário já existe em nosso banco de dados
        const existingUser = await db.query('SELECT * FROM users WHERE sso_id = $1', [ssoUser.sub]);

        if (existingUser.rows.length > 0) {
            // Usuário existe: gerar nosso token de sessão e redirecioná-lo para o cofre
            const user = existingUser.rows[0];
            const payload = { userId: user.id, email: user.email };
            const appToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });

            // Redireciona para o frontend com o token
            res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${appToken}`);
        } else {
            // Usuário não existe: redirecioná-lo para a página de setup
            // Passamos as informações do SSO via query params de forma segura
            const setupParams = new URLSearchParams({
                sso_id: ssoUser.sub,
                email: ssoUser.email,
                name: ssoUser.name
            });
            res.redirect(`${process.env.FRONTEND_URL}/setup?${setupParams.toString()}`);
        }
    } catch (error) {
        console.error("Erro no fluxo de callback do SSO:", error.response ? error.response.data : error.message);
        res.status(500).send("Ocorreu um erro durante a autenticação SSO.");
    }
};

module.exports = {
    redirectToSso,
    handleSsoCallback,
};