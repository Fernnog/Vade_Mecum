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
    toast: document.getElementById('toast-notificacao')
};

// ==========================================
// 2. INICIALIZAÇÃO E EVENTOS
// ==========================================
function init() {
    DOM.cards.forEach(card => {
        card.addEventListener('click', () => selecionarLei(card));
    });
    
    DOM.btnBuscar.addEventListener('click', buscarArtigo);
    DOM.inputArtigo.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') buscarArtigo();
    });
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
        // Nota: Fetch requer servidor local (Live Server) devido a CORS
        const response = await fetch(`${state.leiAtual}.json`);
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

function criarNoDOM(node, level) {
    const divNo = document.createElement('div');
    divNo.className = `legal-node level-${level}`;

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
        
        // Renderiza filhos recursivamente
        node.children.forEach(filho => {
            divInterna.appendChild(criarNoDOM(filho, level + 1));
        });

        divConteudo.appendChild(divInterna);

        // Evento de Toggle
        btn.addEventListener('click', () => {
            const estaExpandido = btn.getAttribute('aria-expanded') === 'true';
            btn.setAttribute('aria-expanded', !estaExpandido);
            divConteudo.classList.toggle('active');
        });

        divNo.appendChild(btn);
        divNo.appendChild(divConteudo);
    }

    return divNo;
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
