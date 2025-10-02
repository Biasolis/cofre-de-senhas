const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  // Pega o header de autorização
  const authHeader = req.headers['authorization'];
  
  // O formato do header é "Bearer TOKEN". Nós queremos apenas o token.
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) {
    // Se não há token, o acesso é não autorizado
    return res.sendStatus(401);
  }

  // Verifica se o token é válido
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      // Se o token for inválido (expirado, etc.), o acesso é proibido
      return res.sendStatus(403);
    }
    
    // Se o token for válido, adicionamos o payload do usuário (que contém o ID)
    // ao objeto `req` para que as próximas rotas possam usá-lo.
    req.user = user;
    next(); // Passa para a próxima função (o controller da rota)
  });
};

module.exports = authMiddleware;