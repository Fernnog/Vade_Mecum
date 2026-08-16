/**
 * Constrói a UI em formato de Acordeão usando Recursividade
 */
export function renderTreeToDOM(treeNode, containerElement) {
    // Limpa o container
    containerElement.innerHTML = '';

    // Renderiza o Caput
    if (treeNode.caput) {
        const caputEl = document.createElement('div');
        caputEl.className = 'caput';
        caputEl.innerText = treeNode.caput;
        containerElement.appendChild(caputEl);
    }

    // Função recursiva para renderizar os filhos (Parágrafos, Incisos, etc)
    function buildNodeUI(node, parentEl) {
        if (!node.children || node.children.length === 0) {
            // Nó folha (sem filhos): exibe apenas um bloco de texto
            const p = document.createElement('p');
            p.className = 'conteudo-no';
            p.innerText = node.text;
            parentEl.appendChild(p);
            return;
        }

        // Nó com filhos: Cria o Acordeão (<details>)
        const details = document.createElement('details');
        const summary = document.createElement('summary');
        
        // Pega os primeiros 40 caracteres para o resumo da "sanfona"
        summary.innerText = node.text.length > 50 ? node.text.substring(0, 50) + '...' : node.text;
        
        const fullText = document.createElement('div');
        fullText.className = 'conteudo-no';
        fullText.innerText = node.text;

        details.appendChild(summary);
        details.appendChild(fullText);

        // Chamada recursiva para os filhos (ex: Alíneas dentro de Incisos)
        node.children.forEach(child => buildNodeUI(child, details));

        parentEl.appendChild(details);
    }

    // Usa DocumentFragment para performance (único Reflow)
    const fragment = document.createDocumentFragment();
    treeNode.children.forEach(child => buildNodeUI(child, fragment));
    containerElement.appendChild(fragment);
}
