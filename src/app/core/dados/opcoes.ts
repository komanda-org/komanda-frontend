/**
 * Listas fixas usadas pelos <select> do cadastro.
 *
 * O prototipo desenha "Selecione sua especialidade" e "Selecione a culinaria"
 * como dropdowns, entao sao dropdowns. A API valida apenas tamanho de string
 * (min 1/max 100 em mainRole, min 3/max 100 em cuisineType) — qualquer item
 * daqui satisfaz isso com folga.
 *
 * Vivem em `core/dados` e nao dentro do componente porque sao dado de dominio,
 * nao detalhe de tela: no dia em que vierem da API, e este arquivo que some.
 */

export const CARGOS: readonly string[] = [
  'Garçom',
  'Cozinheiro',
  'Chef de cozinha',
  'Sous chef',
  'Auxiliar de cozinha',
  'Chapeiro',
  'Pizzaiolo',
  'Confeiteiro',
  'Padeiro',
  'Sushiman',
  'Churrasqueiro',
  'Barista',
  'Bartender',
  'Sommelier',
  'Maître',
  'Hostess',
  'Caixa',
  'Copeiro',
  'Auxiliar de limpeza',
  'Entregador',
  'Gerente de salão',
  'Estoquista',
];

export const TIPOS_DE_COZINHA: readonly string[] = [
  'Brasileira',
  'Comida caseira',
  'Mineira',
  'Nordestina',
  'Churrascaria',
  'Italiana',
  'Japonesa',
  'Chinesa',
  'Árabe',
  'Mexicana',
  'Peruana',
  'Portuguesa',
  'Francesa',
  'Frutos do mar',
  'Pizzaria',
  'Hamburgueria',
  'Padaria e confeitaria',
  'Cafeteria',
  'Bar e petiscos',
  'Vegetariana e vegana',
  'Contemporânea',
];
