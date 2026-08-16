# Meu Vade Mecum Rápido ⚖️

Um aplicativo web simples, estático e ultrarrápido para consultar artigos das principais leis brasileiras (Constituição Federal, CLT, Código Civil, CPC e Código Penal). 

Criado para rodar diretamente no navegador utilizando GitHub Pages, sem necessidade de banco de dados ou servidores complexos. As buscas são feitas de forma instantânea através de arquivos JSON locais.

## 🚀 Funcionalidades

- **Busca Instantânea:** Digite o número do artigo e veja o texto completo em milissegundos.
- **Interface Limpa:** Foco apenas na leitura, sem distrações.
- **Ferramenta de Conversão Integrada:** Possui uma página oculta (acessível pelo ícone de engrenagem) que converte os textos "crus" do site do Planalto em arquivos JSON estruturados para o sistema.
- **100% Estático:** Feito apenas com HTML, CSS e JavaScript puro (Vanilla).

## 📁 Estrutura de Arquivos

Para que o projeto funcione corretamente, os arquivos devem estar organizados da seguinte forma no repositório:

```text
/
├── index.html       # Página principal (Interface de busca)
├── conversor.html   # Ferramenta para gerar os arquivos JSON (acesso na engrenagem)
├── cf.json          # Banco de dados local da Constituição Federal
├── clt.json         # Banco de dados local da CLT
├── cpc.json         # Banco de dados local do Processo Civil
├── cc.json          # Banco de dados local do Código Civil
└── cp.json          # Banco de dados local do Código Penal
