/**
 * Vade Mecum Inteligente - Módulo Principal
 * Arquitetura: ES6 Modules, State Machine, Recursive Parser
 */

// ==========================================
// 1. ESTADO DA APLICAÇÃO E ELEMENTOS DOM
// ==========================================
const state = {
    leiAtual: null,
    nomeLei: null
};

const DOM = {
    cards: document.querySelectorAll('.card'),
    areaBusca: document.getElementById('area-busca'),
    tituloLei: document.getElementById('titulo-lei-selecionada'),
    inputArtigo: document.getElementById('numero-artigo'),
    btnBuscar: document.getElementById('btn-buscar'),
    resultado: document.getElementById('resultado-artigo'),
    toast: document.getElementById('toast-notificacao'),
    resultadoWrapper: document.getElementById('resultado-wrapper'),
    btnExpandir: document.getElementById('btn-expandir'),
    btnFechar: document.getElementById('btn-fechar-expansao')
};

// ==========================================
// 2. INICIALIZAÇÃO E EVENTOS
// ==========================================
function init() {
    DOM.cards.forEach(card => card.addEventListener('click', () => selecionarLei(card)));
    
    DOM.btnBuscar.addEventListener('click', buscarArtigo);
    DOM.inputArtigo.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') buscarArtigo();
    });

    // Controles de Expansão
    DOM.btnExpandir.addEventListener('click', toggleExpandir);
    DOM.btnFechar.addEventListener('click', toggleExpandir);

    // Delegação de Eventos (Event Delegation) no Contêiner Principal
    DOM.resultado.addEventListener('click', (e) => {
        // Toggle do Acordeão
        const btnAcordeao = e.target.closest('.accordion-trigger');
        if (btnAcordeao) {
            const estaExpandido = btnAcordeao.getAttribute('aria-expanded') === 'true';
            btnAcordeao.setAttribute('aria-expanded', !estaExpandido);
            btnAcordeao.nextElementSibling.classList.toggle('active');
            return;
        }

        // Aplicação do Filtro
        if (e.target.matches('.btn-filtrar')) {
            aplicarFiltroInteligente(e.target);
        }
    });
}

function toggleExpandir() {
    const isExpanded = document.body.classList.toggle('modo-expandido-ativo');
    DOM.btnExpandir.setAttribute('aria-pressed', isExpanded);
}

// ==========================================
// 3. LÓGICA DE INTERFACE (UI)
// ==========================================
function selecionarLei(card) {
    // Atualiza estado e UI dos cards
    DOM.cards.forEach(c => c.classList.remove('active'));
    card.classList.add('active');
    
    state.leiAtual = card.dataset.lei;
    state.nomeLei = card.dataset.nome;
    
    DOM.tituloLei.textContent = state.nomeLei;
    DOM.areaBusca.hidden = false;
    DOM.resultado.innerHTML = '';
    DOM.inputArtigo.value = '';
    DOM.inputArtigo.focus();
}

function mostrarToast(mensagem, tipo = 'info') {
    DOM.toast.textContent = mensagem;
    DOM.toast.className = `toast show ${tipo}`;
    setTimeout(() => DOM.toast.classList.remove('show'), 4000);
}

function setLoading(isLoading) {
    DOM.btnBuscar.disabled = isLoading;
    DOM.inputArtigo.disabled = isLoading;
    DOM.resultado.setAttribute('aria-busy', isLoading);
    
    if (isLoading) {
        DOM.btnBuscar.innerHTML = '<span class="loading-spinner"></span> Buscando...';
    } else {
        DOM.btnBuscar.textContent = 'Pesquisar';
    }
}

// ==========================================
// 4. SANITIZAÇÃO E BUSCA (FETCH)
// ==========================================
async function buscarArtigo() {
    const inputCru = DOM.inputArtigo.value;
    
    // Sanitização Inteligente: Extrai apenas números de "5º", "Art 5", etc.
    const numeroLimpo = inputCru.replace(/\D/g, '');
    
    if (!numeroLimpo) {
        mostrarToast('Por favor, digite o número do artigo.', 'error');
        return;
    }

    setLoading(true);
    DOM.resultado.innerHTML = '';

    try {
        // Diretório '/dados/' evita problemas de 404 e limpa a arquitetura local
        const response = await fetch(`./dados/${state.leiAtual}.json`);
        if (!response.ok) throw new Error('Falha ao carregar o arquivo da lei.');
        
        const dados = await response.json();
        const textoCru = dados[numeroLimpo];

        if (!textoCru) {
            mostrarToast(`Artigo ${numeroLimpo} não encontrado nesta lei.`, 'error');
            setLoading(false);
            return;
        }

        // O Coração da Inteligência
        const arvoreJuridica = parsearTextoLegal(textoCru);
        renderizarArvore(arvoreJuridica);
        if (DOM.btnExpandir) DOM.btnExpandir.hidden = false;
        
        if (arvoreJuridica.children.length > 0) {
            mostrarToast('Estrutura hierárquica identificada! Use os botões para expandir.', 'success');
        }

    } catch (error) {
        console.error(error);
        mostrarToast('Erro ao buscar o artigo. Verifique sua conexão ou o arquivo JSON.', 'error');
        DOM.resultado.innerHTML = '<p style="color: red; text-align: center;">Ocorreu um erro ao processar sua busca.</p>';
    } finally {
        setLoading(false);
    }
}

// ==========================================
// 5. O PARSER HIERÁRQUICO (LC 95/98)
// ==========================================
function parsearTextoLegal(texto) {
    // Quebra por linhas, ignorando quebras vazias
    const linhas = texto.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    
    // Estrutura Raiz (O Artigo)
    const raiz = { type: 'artigo', text: '', children: [] };
    
    // Ponteiros de Contexto (Stack simplificada)
    let contextoParagrafo = null;
    let contextoInciso = null;
    let contextoAlinea = null;

    // Regex baseadas na Lei Complementar 95/98
    const REGEX = {
        paragrafo: /^(§\s*\d+º?|Parágrafo\s+único)/i,
        inciso: /^([IVXLCDM]+)\s*[-–—]\s*/i, // Suporta hifens e travessões
        alinea: /^([a-z])\)\s*/i,
        item: /^(\d+)\.\s*/
    };

    for (const linha of linhas) {
        if (REGEX.paragrafo.test(linha)) {
            contextoParagrafo = { type: 'paragrafo', text: linha, children: [] };
            raiz.children.push(contextoParagrafo);
            contextoInciso = null; contextoAlinea = null; // Reseta sub-níveis
        } 
        else if (REGEX.inciso.test(linha)) {
            contextoInciso = { type: 'inciso', text: linha, children: [] };
            // Incisos podem estar no Caput (raiz) ou dentro de um Parágrafo
            if (contextoParagrafo) {
                contextoParagrafo.children.push(contextoInciso);
            } else {
                raiz.children.push(contextoInciso);
            }
            contextoAlinea = null;
        } 
        else if (REGEX.alinea.test(linha)) {
            contextoAlinea = { type: 'alinea', text: linha, children: [] };
            if (contextoInciso) contextoInciso.children.push(contextoAlinea);
        } 
        else if (REGEX.item.test(linha)) {
            const item = { type: 'item', text: linha, children: [] };
            if (contextoAlinea) contextoAlinea.children.push(item);
        } 
        else {
            // Texto contínuo (Caput ou continuação de parágrafo/inciso mal formatado)
            // Prioriza anexar ao nó mais profundo atualmente aberto
            const alvo = contextoAlinea || contextoInciso || contextoParagrafo || raiz;
            alvo.text += (alvo.text ? ' ' : '') + linha;
        }
    }

    return raiz;
}

// ==========================================
// 6. RENDERIZAÇÃO DA ÁRVORE (DRILL-DOWN UI)
// ==========================================
function renderizarArvore(node, level = 0) {
    DOM.resultado.innerHTML = ''; // Limpa antes de renderizar
    DOM.resultado.appendChild(criarNoDOM(node, level));
}

function extrairIDBruto(texto, tipo) {
    if (tipo === 'inciso') return texto.match(/^([IVXLCDM]+)/i)?.[1] || '';
    if (tipo === 'alinea') return texto.match(/^([a-z])/i)?.[1] || '';
    if (tipo === 'item') return texto.match(/^(\d+)/)?.[1] || '';
    return '';
}

function criarNoDOM(node, level, index = 0) {
    const divNo = document.createElement('div');
    divNo.className = `legal-node level-${level}`;
    
    // Injeção de estado no DOM para busca posterior do filtro
    const rawId = extrairIDBruto(node.text, node.type).toLowerCase();
    divNo.dataset.index = index;
    divNo.dataset.rawid = rawId;

    // Texto do Nó
    const divTexto = document.createElement('div');
    divTexto.className = `node-text type-${node.type}`;
    divTexto.textContent = node.text;
    divNo.appendChild(divTexto);

    // Se tiver filhos, cria o Acordeão
    if (node.children && node.children.length > 0) {
        const btn = document.createElement('button');
        btn.className = 'accordion-trigger';
        btn.setAttribute('aria-expanded', 'false');
        btn.innerHTML = `Ver ${node.children.length} ${getLabelFilhos(node.type)} <span class="icon">▼</span>`;

        const divConteudo = document.createElement('div');
        divConteudo.className = 'accordion-content';
        
        const divInterna = document.createElement('div');
        divInterna.className = 'inner-wrapper';

        // Filtro visual estrutural injetado no DOM (Gatilho tratado pelo Event Delegation)
        if (node.children.length > 10) {
            const idStart = extrairIDBruto(node.children[0].text, node.children[0].type);
            const idEnd = extrairIDBruto(node.children[node.children.length - 1].text, node.children[node.children.length - 1].type);

            divConteudo.insertAdjacentHTML('afterbegin', `
                <div class="filtro-inteligente">
                    <label for="filtro-start-${index}" class="sr-only">Início do intervalo</label>
                    <input id="filtro-start-${index}" type="text" class="input-filtro start" value="${idStart}">
                    <span>até</span>
                    <label for="filtro-end-${index}" class="sr-only">Fim do intervalo</label>
                    <input id="filtro-end-${index}" type="text" class="input-filtro end" value="${idEnd}">
                    <button class="btn-filtrar" type="button">Aplicar Filtro</button>
                </div>
            `);
        }

        // Renderiza filhos recursivamente repassando o index
        node.children.forEach((filho, idx) => {
            divInterna.appendChild(criarNoDOM(filho, level + 1, idx));
        });

        divConteudo.appendChild(divInterna);
        divNo.append(btn, divConteudo);
    }

    return divNo;
}

function aplicarFiltroInteligente(btnElement) {
    const container = btnElement.closest('.accordion-content');
    const startVal = container.querySelector('.start').value.trim().toLowerCase();
    const endVal = container.querySelector('.end').value.trim().toLowerCase();
    const wrapper = container.querySelector('.inner-wrapper');
    const nodes = Array.from(wrapper.querySelectorAll(':scope > .legal-node'));
    
    let indexStart = 0, indexEnd = nodes.length - 1;

    // Busca de O(N) simples através de atributos memoizados
    nodes.forEach((node) => {
        if (node.dataset.rawid === startVal) indexStart = parseInt(node.dataset.index);
        if (node.dataset.rawid === endVal) indexEnd = parseInt(node.dataset.index);
    });

    if (indexStart > indexEnd) [indexStart, indexEnd] = [indexEnd, indexStart];

    // Manipulação segura de classes (Sem mutar style inline)
    nodes.forEach(node => {
        const idx = parseInt(node.dataset.index);
        if (idx >= indexStart && idx <= indexEnd) {
            node.classList.remove('is-hidden');
        } else {
            node.classList.add('is-hidden');
        }
    });
}

function getLabelFilhos(tipoPai) {
    const labels = {
        'artigo': 'parágrafos ou incisos',
        'paragrafo': 'incisos',
        'inciso': 'alíneas',
        'alinea': 'itens'
    };
    return labels[tipoPai] || 'subitens';
}

// Inicia a aplicação quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', init);
