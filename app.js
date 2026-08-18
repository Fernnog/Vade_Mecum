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
    const inputCru = DOM.inputArtigo.value.trim();
    
    // 1. Lexical Tokenization
    // Transforma "5, § 2º, III, a)" em array direcional: ['5', '2', 'iii', 'a']
    const tokensCaminho = tokenizarEntradaJuridica(inputCru);
    const numeroLimpo = tokensCaminho[0]; // O primeiro item é sempre o Artigo
    
    if (!numeroLimpo) {
        mostrarToast('Por favor, digite o número do artigo.', 'error');
        return;
    }

    setLoading(true);
    DOM.resultado.innerHTML = '';

    try {
        const response = await fetch(`./dados/${state.leiAtual}.json`);
        if (!response.ok) throw new Error('Falha ao carregar o arquivo da lei.');
        
        const dados = await response.json();
        const textoCru = dados[numeroLimpo];

        if (!textoCru) {
            mostrarToast(`Artigo ${numeroLimpo} não encontrado nesta lei.`, 'error');
            return;
        }

        // 2. AST Generation
        const arvoreJuridica = parsearTextoLegal(textoCru);
        
        // 3. Target-Aware Rendering (Passamos os tokens do caminho - pulando o [0] que é a raiz)
        const tokensRamificacao = tokensCaminho.slice(1);
        DOM.resultado.innerHTML = '';
        DOM.resultado.appendChild(criarNoDOM(arvoreJuridica, 0, 0, tokensRamificacao));
        
        if (DOM.btnExpandir) DOM.btnExpandir.hidden = false;
        
        // NOVO: Forçar a expansão automática do painel após uma pesquisa bem-sucedida
        if (!document.body.classList.contains('modo-expandido-ativo')) {
            toggleExpandir();
        }
        
        // 4. Post-Render Scroll Hook
        focarElementoDestino(tokensCaminho.length > 1);

    } catch (error) {
        console.error(error);
        mostrarToast('Erro ao buscar o artigo. Verifique o arquivo JSON.', 'error');
        DOM.resultado.innerHTML = '<p style="color: red; text-align: center;">Ocorreu um erro de conexão.</p>';
    } finally {
        setLoading(false);
    }
}

// NOVA FUNÇÃO: Tokenizer Jurídico Seguro
function tokenizarEntradaJuridica(input) {
    const limpo = input.toLowerCase()
        .replace(/art\.?|§|º|ª|parágrafo|inciso|alínea|item/g, ' ')
        .replace(/[(),.-]/g, ' ')
        .trim();
    
    return limpo.split(/\s+/).filter(t => t.length > 0);
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
    if (tipo === 'inciso') return texto.match(/^\s*([IVXLCDM]+)/i)?.[1] || '';
    if (tipo === 'alinea') return texto.match(/^\s*([a-z])/i)?.[1] || '';
    if (tipo === 'item') return texto.match(/^\s*(\d+)/)?.[1] || '';
    
    if (tipo === 'paragrafo') {
        const numParagrafo = texto.match(/§\s*(\d+)/)?.[1];
        if (numParagrafo) return numParagrafo;
        if (/parágrafo\s+único/i.test(texto)) return 'unico';
    }
    return '';
}

// ATUALIZAÇÃO ARQUITETURAL NA RENDERIZAÇÃO: Target-Aware DOM Builder
function criarNoDOM(node, level, index = 0, tokensBusca = []) {
    const divNo = document.createElement('div');
    const rawId = extrairIDBruto(node.text, node.type).toLowerCase();
    
    let isTargetBranch = false;
    let proximosTokens = [];

    if (node.type === 'artigo') {
        isTargetBranch = tokensBusca.length > 0;
        proximosTokens = tokensBusca; 
    } else {
        isTargetBranch = tokensBusca.length > 0 && rawId === tokensBusca[0];
        proximosTokens = isTargetBranch ? tokensBusca.slice(1) : [];
    }

    const isFinalDestination = node.type !== 'artigo' && isTargetBranch && tokensBusca.length === 1;
    
    divNo.className = `legal-node level-${level} ${isFinalDestination ? 'highlight-node' : ''}`;
    divNo.dataset.index = index;
    divNo.dataset.rawid = rawId;

    const divTexto = document.createElement('div');
    divTexto.className = `node-text type-${node.type}`;
    divTexto.textContent = node.text;
    divNo.appendChild(divTexto);

    if (node.children && node.children.length > 0) {
        const btn = document.createElement('button');
        btn.className = 'accordion-trigger';
        btn.setAttribute('aria-expanded', isTargetBranch ? 'true' : 'false');
        btn.innerHTML = `Ver ${node.children.length} ${getLabelFilhos(node.type)} <span class="icon">▼</span>`;

        const divConteudo = document.createElement('div');
        divConteudo.className = `accordion-content ${isTargetBranch ? 'active' : ''}`;
        
        const divInterna = document.createElement('div');
        divInterna.className = 'inner-wrapper';

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

        node.children.forEach((filho, idx) => {
            divInterna.appendChild(criarNoDOM(filho, level + 1, idx, proximosTokens));
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

// NOVA FUNÇÃO: Pós-processamento de Viewport
function focarElementoDestino(teveNavegacaoProfunda) {
    if (!teveNavegacaoProfunda) return; // Se procurou só o Artigo, não precisa focar subitem
    
    // requestAnimationFrame garante que o navegador já pintou o DOM e calculou alturas do Acordeão
    requestAnimationFrame(() => {
        const destinoFinal = document.querySelector('.highlight-node');
        if (destinoFinal) {
            destinoFinal.scrollIntoView({ behavior: 'smooth', block: 'center' });
            mostrarToast('Destino localizado!', 'success');
        } else {
            // Fallback seguro caso o usuário digite um caminho que não existe na lei
            mostrarToast('Subitem não encontrado no texto deste artigo.', 'error');
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