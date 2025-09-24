# E2E Marketplace

Um marketplace educacional desenvolvido como MVP (Minimum Viable Product) para demonstração de funcionalidades de e-commerce. Este projeto simula um sistema completo de marketplace sem backend, utilizando apenas tecnologias frontend e armazenamento local.

## 🚀 Características

- **Interface moderna e responsiva** com design inspirado no Magalu
- **Sistema de autenticação** com diferentes perfis de usuário
- **Catálogo de produtos** com filtros e busca
- **Carrinho de compras** funcional
- **Sistema de checkout** com simulação de pagamento
- **Painel administrativo** para gestão de fornecedores
- **Painel do vendedor** para gestão de estoque
- **Armazenamento local** (localStorage) para persistência de dados

## 👥 Perfis de Usuário

### Cliente
- Navegar pelo catálogo de produtos
- Adicionar produtos ao carrinho
- Finalizar compras
- Gerenciar perfil pessoal

### Vendedor
- Visualizar produtos
- Gerenciar estoque (adicionar unidades)
- Acessar painel específico

### Administrador
- Gerenciar fornecedores
- Visualizar todos os produtos
- Acesso completo ao sistema

## 🛠️ Tecnologias Utilizadas

- **HTML5** - Estrutura semântica
- **CSS3** - Estilização moderna com variáveis CSS e Grid/Flexbox
- **JavaScript (ES6+)** - Lógica da aplicação
- **Web Crypto API** - Hash de senhas (SHA-256)
- **LocalStorage** - Persistência de dados
- **Google Fonts** - Tipografia (Inter)

## 📁 Estrutura do Projeto

```
e2e_marketplace/
├── index.html          # Página principal
├── script.js           # Lógica da aplicação
├── style.css           # Estilos CSS
└── README.md           # Documentação
```

## 🚀 Como Executar

1. Clone ou baixe o projeto
2. Abra o arquivo `index.html` em um navegador web moderno
3. O sistema carregará automaticamente os dados iniciais na primeira execução

## 🔐 Usuários de Teste

O sistema vem com usuários pré-cadastrados para demonstração:

| Perfil | Email | Senha |
|--------|-------|-------|
| Cliente | ana@e2e.com | Ana@Cliente123! |
| Vendedor | vini@e2e.com | Vini@Vendedor123! |
| Admin | admin@e2e.com | Admin@123456! |

## ✨ Funcionalidades Principais

### Sistema de Autenticação
- Cadastro de novos usuários
- Login com validação de credenciais
- Diferentes perfis (cliente, vendedor, admin)
- Sessão com timeout automático (30 minutos)
- Hash seguro de senhas (SHA-256)

### Catálogo de Produtos
- Grid responsivo de produtos
- Sistema de busca em tempo real
- Filtros por categoria
- Ordenação por preço e estoque
- Paginação de resultados
- Modal de detalhes do produto

### Carrinho de Compras
- Adicionar/remover produtos
- Ajustar quantidades
- Cálculo automático de totais
- Persistência entre sessões

### Sistema de Checkout
- Formulário de endereço de entrega
- Opções de frete (fixo ou calculado)
- Simulação de pagamento (cartão/PIX)
- Validação de dados do cartão (algoritmo de Luhn)
- Geração de código PIX simulado

### Gestão de Estoque (Vendedor)
- Visualização de produtos
- Adição de estoque (múltiplos de 10)
- Validação de limites

### Gestão de Fornecedores (Admin)
- Listagem de fornecedores
- Cadastro/edição/exclusão
- Vinculação com produtos

## 🎨 Design e UX

- **Design System** consistente com variáveis CSS
- **Responsividade** para desktop, tablet e mobile
- **Acessibilidade** com roles ARIA e navegação por teclado
- **Feedback visual** com toasts e modais
- **Loading states** e validações em tempo real

## 🔧 Arquitetura

### Padrões Utilizados
- **MVC Pattern** - Separação de responsabilidades
- **Module Pattern** - Organização do código JavaScript
- **Event Delegation** - Gerenciamento eficiente de eventos
- **Local Storage Pattern** - Persistência de dados

### Estrutura de Dados
```javascript
// Usuários
{ id, nome, email, senhaHash, perfil }

// Produtos
{ id, nome, categoria, preco, estoque, descricao, imagem, ativo, fornecedorId }

// Fornecedores
{ id, nomeLoja, cnpj, contato }

// Pedidos
{ id, userId, itens, endereco, freteTipo, pagamentoTipo, total, status, criadoEm }
```

## 🚧 Limitações do MVP

- **Sem backend** - Todos os dados são armazenados localmente
- **Simulação de pagamento** - Não processa pagamentos reais
- **Dados em memória** - Perdidos ao limpar o navegador
- **Sem validação de CNPJ** - Apenas formato básico
- **Imagens externas** - Dependência de serviços externos

## 🔮 Possíveis Melhorias

- Integração com backend real
- Sistema de notificações
- Relatórios e analytics
- Sistema de avaliações
- Chat de suporte
- Integração com gateways de pagamento
- Upload de imagens
- Sistema de cupons de desconto

## 📝 Licença

Este é um projeto educacional desenvolvido para fins de demonstração. Livre para uso e modificação.

## 👨‍💻 Desenvolvido por

Projeto desenvolvido como MVP educacional para demonstração de funcionalidades de e-commerce.

---

**Nota**: Este é um projeto de demonstração sem backend real. Todos os dados são simulados e armazenados localmente no navegador.
