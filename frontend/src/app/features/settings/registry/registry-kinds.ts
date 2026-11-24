/** The catalogs Configurações manages, as they appear in the address (`?cadastro=autores`). */
export const REGISTRY_KINDS = [
  {
    id: 'generos',
    label: 'Gêneros',
    one: 'gênero',
    many: 'gêneros',
    feminine: false,
    help: 'Os gêneros que aparecem no cadastro de livros e na página Catálogos.',
    placeholder: 'Ex.: Terror',
  },
  {
    id: 'subgeneros',
    label: 'Subgêneros',
    one: 'subgênero',
    many: 'subgêneros',
    feminine: false,
    help: 'Cada subgênero pertence a um gênero. No cadastro de livros todos aparecem na lista.',
    placeholder: 'Ex.: Fantasia sombria',
  },
  {
    id: 'autores',
    label: 'Autores',
    one: 'autor',
    many: 'autores',
    feminine: false,
    help: 'Autores só saem da lista quando não têm nenhum livro cadastrado.',
    placeholder: 'Ex.: Ursula K. Le Guin',
  },
  {
    id: 'editoras',
    label: 'Editoras',
    one: 'editora',
    many: 'editoras',
    feminine: true,
    help: 'Editoras usadas no cadastro dos livros.',
    placeholder: 'Ex.: Martins Fontes',
  },
  {
    id: 'livros',
    label: 'Livros',
    one: 'livro',
    many: 'livros',
    feminine: false,
    help: 'Todos os livros da biblioteca, para consulta e exclusão. Para cadastrar, use “Adicionar livro”.',
    placeholder: '',
  },
  {
    id: 'listas',
    label: 'Listas',
    one: 'lista',
    many: 'listas',
    feminine: true,
    help: 'Crie listas novas ou apague as que não usa mais. Os livros continuam na estante.',
    placeholder: 'Ex.: Lidos no inverno',
  },
] as const;

export type RegistryKind = (typeof REGISTRY_KINDS)[number]['id'];
export type RegistryKindInfo = (typeof REGISTRY_KINDS)[number];

/** `1 gênero`, `6 gêneros`. */
export function countOf(count: number, kind: RegistryKindInfo): string {
  return `${count.toLocaleString('pt-BR')} ${count === 1 ? kind.one : kind.many}`;
}

/** `13 livros`, `1 livro`. */
export function booksOf(count: number): string {
  return count === 1 ? '1 livro' : `${count.toLocaleString('pt-BR')} livros`;
}

/** "Anéis" and "aneis" are the same name. */
export function normalize(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').replace(/\s+/g, ' ').trim().toLowerCase();
}
