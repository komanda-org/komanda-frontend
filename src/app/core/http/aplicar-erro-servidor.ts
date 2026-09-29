import { FormGroup } from '@angular/forms';

/**
 * Leva a mensagem do servidor ate o control certo: o 400 do Nest chega como
 * lista de frases e um banner generico obriga a pessoa a adivinhar qual campo
 * errou — aqui cada frase vira erro do proprio campo, e so o que nao pertence
 * a campo nenhum volta para o banner.
 *
 * A busca ignora acentos e caixa, porque o texto vem do back-end e varia.
 */
const ALIASES: Readonly<Record<string, readonly string[]>> = {
  email: ['e-mail'],
  password: ['senha'],
  fullname: ['nome completo', 'nome'],
  mainrole: ['cargo'],
  profilephoto: ['foto'],
  neighborhood: ['bairro'],
  zipcode: ['cep'],
  phone: ['telefone', 'whatsapp', 'fone'],
  restaurantname: ['nome fantasia', 'restaurante'],
  cnpj: [],
  cuisinetype: ['cozinha', 'culinaria'],
  description: ['descricao', 'ambiente'],
  address: ['endereco'],
  logourl: ['logo'],
  interestedroles: ['interesse', 'funcoes'],
  experiencesummary: ['experiencia', 'resumo', 'trajetoria'],
};

function semAcento(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function nomeDoControl(form: FormGroup, mensagem: string): string | null {
  const texto = semAcento(mensagem);

  for (const nome of Object.keys(form.controls)) {
    const chave = semAcento(nome);
    if (texto.includes(chave)) {
      return nome;
    }
    if ((ALIASES[chave] ?? []).some((apelido) => texto.includes(apelido))) {
      return nome;
    }
  }

  return null;
}

/** Espalha as mensagens pelos controls; devolve as que sobraram para o banner. */
export function aplicarErrosDeValidacao(form: FormGroup, mensagens: string[]): string[] {
  const restantes: string[] = [];

  for (const mensagem of mensagens) {
    const control = nomeDoControl(form, mensagem);
    if (!control) {
      restantes.push(mensagem);
      continue;
    }

    const alvo = form.get(control);
    alvo?.setErrors({ ...(alvo.errors ?? {}), servidor: mensagem });
    alvo?.markAsTouched();
  }

  return restantes;
}

/** Marca o campo recusado com 409 para o erro aparecer nele, nao so no banner. */
export function aplicarConflito(form: FormGroup, campo: string | null): void {
  if (!campo) {
    return;
  }

  const alvo = form.get(campo);
  if (!alvo) {
    return;
  }

  alvo.setErrors({ ...(alvo.errors ?? {}), conflito: true });
  alvo.markAsTouched();
}
