/**
 * MOCK DESCARTAVEL da API — apenas para testar o front-end.
 *
 * As rotas POST /professionals e POST /restaurantes/cadastro ainda nao existem
 * no NestJS. Este arquivo finge ser elas, na mesma porta 3000, para que voce
 * consiga ver o fluxo completo: sucesso, 409 e 400.
 *
 * Nao tem dependencia nenhuma — e o http do proprio Node.
 * Rodar:  node mock-api.mjs
 * Apagar: quando o back-end real existir, delete este arquivo.
 *
 * GATILHOS (o que digitar no formulario para provocar cada resposta):
 *   email  usado@komanda.com          -> 409 "User already exists"
 *   email  erro400@komanda.com        -> 400 com lista de mensagens
 *   CNPJ   11.222.333/0001-81         -> 409 "CNPJ already exists"
 *   CNPJ   11.222.333/0002-62         -> 201 (CNPJ valido pelo algoritmo)
 *   qualquer outro                    -> 201 Created
 */
import { createServer } from 'node:http';

const PORTA = 3000;
const ROTAS = ['/professionals', '/restaurantes/cadastro'];

function responder(res, status, corpo) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(corpo));
}

createServer((req, res) => {
  if (req.method !== 'POST' || !ROTAS.includes(req.url)) {
    return responder(res, 404, { statusCode: 404, message: 'Cannot ' + req.method + ' ' + req.url });
  }

  let bruto = '';
  req.on('data', (pedaco) => (bruto += pedaco));

  req.on('end', () => {
    const corpo = JSON.parse(bruto || '{}');
    console.log('\n->', req.url, '\n', JSON.stringify(corpo, null, 2));

    // Atraso proposital: da tempo de ver o botao em "Abrindo conta..."
    setTimeout(() => {
      if (corpo.email === 'usado@komanda.com') {
        // 409 do Nest: `message` e STRING
        return responder(res, 409, {
          statusCode: 409,
          message: 'User already exists',
          error: 'Conflict',
        });
      }

      if (corpo.cnpj === '11.222.333/0001-81') {
        return responder(res, 409, {
          statusCode: 409,
          message: 'CNPJ already exists',
          error: 'Conflict',
        });
      }

      if (corpo.email === 'erro400@komanda.com') {
        // 400 do ValidationPipe: `message` e ARRAY
        return responder(res, 400, {
          statusCode: 400,
          message: [
            'Email deve ser valido',
            'Senha deve ter no minimo 8 caracteres',
          ],
          error: 'Bad Request',
        });
      }

      responder(res, 201, { id: crypto.randomUUID(), email: corpo.email });
    }, 600);
  });
}).listen(PORTA, () => {
  console.log(`Mock da API do Komanda em http://localhost:${PORTA}`);
  console.log('Rotas:', ROTAS.join('  '));
});
