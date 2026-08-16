import { parseLeiToTree } from './parser.js';
import { renderTreeToDOM } from './ui.js';

// Estado encapsulado no módulo
const state = {
    arquivoJsonAtual: '',
    nomeLeiAtual: ''
};

// Elementos DOM cacheados
const DOM = {
    areaBusca: document.getElementById('area-busca'),
    tituloLei: document.getElementById('titulo-lei-selecionada'),
    inputArtigo: document.getElementById('input-artigo'),
    btnBuscar: document.getElementById('btn-buscar'),
    resultado: document.getElementById('resultado-artigo'),
    loading: document.getElementById('estado-loading'),
    erro: document.getElementById('estado-erro'),
    cards: document.querySelectorAll('.card-lei')
};

// Event Listeners
DOM.cards.forEach(card => card.addEventListener('click', (e) => {
    state.arquivoJsonAtual = e.target.dataset.sigla + '.json';
    state.nomeLeiAtual = e.target.dataset.nome;
    abrirPainelBusca();
}));

DOM.btnBuscar.addEventListener('click', processarBusca);
DOM.inputArtigo.addEventListener('keypress', (e) => { if (e.key === 'Enter') processarBusca(); });

function abrirPainelBusca() {
    DOM.tituloLei.innerText = `Buscando em: ${state.nomeLeiAtual}`;
    DOM.areaBusca.style.display = 'block';
    DOM.resultado.innerHTML = '';
    DOM.inputArtigo.value = '';
    DOM.inputArtigo.focus();
    esconderMensagens();
}

function esconderMensagens() {
    DOM.loading.classList.add('hidden');
    DOM.erro.classList.add('hidden');
    DOM.resultado.classList.remove('hidden');
}

function higienizarInput(valorOriginal) {
    // Remove tudo que não for dígito. Ex: "Art 5º" -> "5"
    return valorOriginal.replace(/\D/g, '');
}

async function processarBusca() {
    const inputLimpo = higienizarInput(DOM.inputArtigo.value);

    if (!inputLimpo) {
        mostrarErro("Por favor, digite o número de um artigo (ex: 5).");
        return;
    }

    esconderMensagens();
    DOM.resultado.innerHTML = '';
    DOM.loading.classList.remove('hidden'); // Ativa Loading

    try {
        const response = await fetch(state.arquivoJsonAtual);
        if (!response.ok) throw new Error("Base de dados não encontrada.");
        
        const dados = await response.json();
        const textoCru = dados[inputLimpo];

        if (!textoCru) {
            mostrarErro(`O Artigo ${inputLimpo} não foi encontrado, pode ter sido revogado ou vetado.`);
            return;
        }

        // 1. Converte a string suja numa Árvore Hierárquica
        const arvoreLegislativa = parseLeiToTree(textoCru);
        
        // 2. Entrega a Árvore para a UI renderizar os Acordeões
        renderTreeToDOM(arvoreLegislativa, DOM.resultado);
        
        DOM.loading.classList.add('hidden');
    } catch (error) {
        mostrarErro("Erro de conexão ao processar a lei. Tente novamente.");
        console.error(error);
    }
}

function mostrarErro(mensagem) {
    DOM.loading.classList.add('hidden');
    DOM.resultado.classList.add('hidden');
    DOM.erro.innerText = mensagem;
    DOM.erro.classList.remove('hidden');
}
