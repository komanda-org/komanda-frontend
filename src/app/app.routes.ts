import { Routes } from '@angular/router';

/**
 * Tabela de rotas.
 *
 * O fluxo do prototipo vira tres rotas: a escolha de perfil e uma tela propria,
 * e cada perfil tem a sua. Nao sao "etapas do Router" — as etapas de dentro de
 * cada cadastro sao estado do componente, para que voltar uma etapa nao perca
 * o que ja foi digitado.
 *
 * CONCEITO: lazy loading
 * `loadComponent` recebe uma funcao que so roda quando a rota e visitada. O
 * `import()` dinamico faz o bundler separar aquele componente num arquivo
 * proprio — quem abre /registro nao baixa o codigo do cadastro do restaurante.
 */
export const routes: Routes = [
  {
    path: '',
    // pathMatch 'full' e obrigatorio aqui: sem ele, '' casaria com QUALQUER
    // caminho (todo path comeca com string vazia) e nada mais seria alcancado.
    pathMatch: 'full',
    redirectTo: 'registro',
  },
  {
    path: 'registro',
    title: 'Criar conta · Komanda',
    loadComponent: () =>
      import('./features/registro/escolha-perfil/escolha-perfil').then((m) => m.EscolhaPerfil),
  },
  {
    path: 'registro/profissional',
    title: 'Criar conta · Profissional · Komanda',
    loadComponent: () =>
      import('./features/registro/profissional/registro-profissional').then(
        (m) => m.RegistroProfissional,
      ),
  },
  {
    path: 'registro/restaurante',
    title: 'Criar conta · Restaurante · Komanda',
    loadComponent: () =>
      import('./features/registro/restaurante/registro-restaurante').then(
        (m) => m.RegistroRestaurante,
      ),
  },
  {
    path: 'login',
    title: 'Entrar · Komanda',
    loadComponent: () => import('./features/login/login').then((m) => m.Login),
  },
  {
    // Curinga sempre por ultimo: o Router para no primeiro que casar.
    path: '**',
    redirectTo: 'registro',
  },
];
