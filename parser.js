/**
 * Transforma a string de texto bruto em uma Árvore Hierárquica.
 * Identifica Caput, Parágrafos, Incisos, Alíneas baseando-se na LC 95/98.
 */
export function parseLeiToTree(textoBruto) {
    const linhas = textoBruto.split('\n').map(l => l.trim()).filter(l => l);
    
    const tree = { type: 'artigo', caput: '', children: [] };
    
    // Pilha para controlar a profundidade/hierarquia atual
    let parentStack = [tree];

    linhas.forEach(linha => {
        // Regex aprimoradas e defensivas
        const isParagrafo = /^(§|Parágrafo único)/i.test(linha);
        const isInciso = /^[IVXLCDM]+\s*-/i.test(linha);
        const isAlinea = /^[a-z]\)/i.test(linha);

        const node = { text: linha, children: [] };

        if (isParagrafo) {
            node.type = 'paragrafo';
            parentStack = [tree]; // Parágrafo desce pro nível raiz da árvore
            parentStack[0].children.push(node);
            parentStack.unshift(node); // Novo pai
        } else if (isInciso) {
            node.type = 'inciso';
            // Se o último nó foi alínea, precisamos subir a pilha para achar o pai correto
            while (parentStack[0].type === 'alinea' || parentStack[0].type === 'inciso') {
                parentStack.shift();
            }
            parentStack[0].children.push(node);
            parentStack.unshift(node);
        } else if (isAlinea) {
            node.type = 'alinea';
            // Alíneas devem estar atreladas a Incisos ou Parágrafos
            parentStack[0].children.push(node);
        } else {
            // Se não é nada disso, é continuação do Caput ou texto solto
            if (parentStack[0] === tree) {
                tree.caput += (tree.caput ? '\n' : '') + linha;
            } else {
                parentStack[0].text += '\n' + linha;
            }
        }
    });

    return tree;
}
