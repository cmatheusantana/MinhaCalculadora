
const visor = document.getElementById("visor");
const listaHistorico = document.getElementById("lista-historico");

// Recupera o histórico salvo no navegador
let historico = [];

try {
    historico = JSON.parse(localStorage.getItem("historico")) || [];
} catch {
    historico = [];
}

// Identifica a classe de cada símbolo
function classeSimbolo(simbolo) {
    const classes = {
        "+": "simbolo-adicao",
        "-": "simbolo-subtracao",
        "*": "simbolo-multiplicacao",
        "/": "simbolo-divisao"
    };

    return classes[simbolo] || "";
}

// Exibe uma expressão com os símbolos coloridos
function aplicarCores(elemento, texto) {
    const visual = texto.replaceAll("*", "×").replaceAll("/", "÷");

    elemento.innerHTML = "";

    for (const caractere of visual) {
        const classe = classeSimbolo(
            caractere === "×" ? "*" :
            caractere === "÷" ? "/" :
            caractere
        );

        if (classe) {
            const span = document.createElement("span");
            span.className = classe;
            span.textContent = caractere;
            elemento.appendChild(span);
        } else {
            elemento.appendChild(
                document.createTextNode(caractere)
            );
        }
    }
}

// Recupera a expressão em formato matemático
function obterExpressao() {
    return visor.textContent
        .replaceAll("×", "*")
        .replaceAll("÷", "/");
}

// Define o conteúdo do visor
function definirVisor(texto) {
    aplicarCores(visor, String(texto));
}

// Valida a expressão antes de inserir
function validarExpressao(expressao) {
    const operadores = "+-*/";

    // Impede operadores consecutivos
    for (let i = 1; i < expressao.length; i++) {
        const anterior = expressao[i - 1];
        const atual = expressao[i];

        if (
            operadores.includes(anterior) &&
            operadores.includes(atual)
        ) {
            if (atual === "-" && anterior !== "-") {
                continue;
            }

            return false;
        }
    }

    // Impede mais de um ponto decimal no mesmo número
    const numeros = expressao.split(/[+\-*/()]/);

    for (const numero of numeros) {
        if ((numero.match(/\./g) || []).length > 1) {
            return false;
        }
    }

    return true;
}

// Adiciona números e operadores ao visor
function adicionar(valor) {
    let texto = obterExpressao();

    if (texto === "Erro") {
        texto = "";
    }

    const novaExpressao = texto + valor;

    if (!validarExpressao(novaExpressao)) {
        return;
    }

    definirVisor(novaExpressao);
}

// Limpa o visor
function limpar() {
    definirVisor("");
}

// Apaga o último caractere
function apagar() {
    const texto = obterExpressao();
    definirVisor(texto.slice(0, -1));
}

// Realiza o cálculo
function calcular() {
    try {
        const expressao = obterExpressao();

        if (
            !expressao ||
            !/^[0-9+\-*/.() ]+$/.test(expressao)
        ) {
            throw new Error("Expressão inválida");
        }

        const resultado = Function(
            '"use strict"; return (' + expressao + ')'
        )();

        if (
            expressao.includes("/") &&
            !Number.isFinite(resultado)
        ) {
            alert("Não é possível dividir por zero!");
            definirVisor("");
            return;
        }

        if (!Number.isFinite(resultado)) {
            throw new Error("Resultado inválido");
        }

        const resultadoFinal = Number(resultado.toFixed(10));

        // Registra a operação no histórico
        historico.unshift({
            conta: expressao,
            resultado: resultadoFinal
        });

        // Mantém somente as 10 últimas operações
        historico = historico.slice(0, 10);

        // Salva no navegador
        localStorage.setItem(
            "historico",
            JSON.stringify(historico)
        );

        atualizarHistorico();

        // Mostra o resultado
        definirVisor(String(resultadoFinal));

    } catch {
        definirVisor("Erro");
    }
}

// Exibe as operações na tela
function atualizarHistorico() {
    listaHistorico.innerHTML = "";

    if (historico.length === 0) {
        listaHistorico.textContent =
            "Nenhuma operação realizada.";
        return;
    }

    historico.forEach(function(operacao) {
        const item = document.createElement("div");
        item.classList.add("item-historico");

        // Reutiliza a operação ao clicar
        item.addEventListener("click", function() {
            definirVisor(operacao.conta);
        });

        const conta = document.createElement("p");
        aplicarCores(conta, operacao.conta);

        const resultado = document.createElement("strong");
        resultado.textContent = "= " + operacao.resultado;

        // Botão para copiar o resultado
        const copiar = document.createElement("button");
        copiar.textContent = "Copiar";

        copiar.addEventListener("click", async function(event) {
            event.stopPropagation();

            try {
                await navigator.clipboard.writeText(
                    String(operacao.resultado)
                );

                copiar.textContent = "Copiado!";

                setTimeout(function() {
                    copiar.textContent = "Copiar";
                }, 1500);

            } catch {
                alert("Não foi possível copiar o resultado.");
            }
        });

        item.appendChild(conta);
        item.appendChild(resultado);
        item.appendChild(copiar);

        listaHistorico.appendChild(item);
    });
}

// Limpa todo o histórico
function limparHistorico() {
    const confirmar = confirm(
        "Tem certeza que deseja apagar todo o histórico?"
    );

    if (confirmar) {
        historico = [];
        localStorage.removeItem("historico");
        atualizarHistorico();
    }
}

// Trata valores colados no visor
function tratarColagem(event) {
    event.preventDefault();

    const texto = event.clipboardData.getData("text");
    const valor = texto.replace(/,/g, ".");

    if (!/^[0-9+\-*/.() ]+$/.test(valor)) {
        alert("O conteúdo copiado não é válido.");
        return;
    }

    adicionar(valor);
}

// Detecta colagem com o mouse ou Ctrl + V
visor.addEventListener("paste", tratarColagem);

// Permite utilizar o teclado
document.addEventListener("keydown", async function(event) {
    const tecla = event.key;
    const editando = document.activeElement === visor;

    // Ctrl + V quando o visor não está selecionado
    if (
        (event.ctrlKey || event.metaKey) &&
        tecla.toLowerCase() === "v" &&
        !editando
    ) {
        event.preventDefault();

        try {
            const texto = await navigator.clipboard.readText();
            const valor = texto.replace(/,/g, ".");

            if (/^[0-9+\-*/.() ]+$/.test(valor)) {
                adicionar(valor);
            } else {
                alert("O conteúdo copiado não é válido.");
            }

        } catch {
            alert("Não foi possível acessar a área de transferência.");
        }

        return;
    }

    if (editando) {
        if (tecla === "Enter") {
            event.preventDefault();
            calcular();
            return;
        }

        if (tecla === "Escape") {
            limpar();
            return;
        }

        if (tecla === "Backspace" || tecla === "Delete") {
            event.preventDefault();
            apagar();
            return;
        }

        if (/^[0-9+\-*/().]$/.test(tecla)) {
            event.preventDefault();
            adicionar(tecla);
            return;
        }

        if (tecla === ",") {
            event.preventDefault();
            adicionar(".");
            return;
        }

        if (
            tecla.length === 1 &&
            !event.ctrlKey &&
            !event.metaKey &&
            !event.altKey
        ) {
            event.preventDefault();
        }

        return;
    }

    // Atalhos quando o visor não está selecionado
    if (/^[0-9+\-*/().]$/.test(tecla)) {
        adicionar(tecla);
    } else if (tecla === ",") {
        adicionar(".");
    } else if (tecla === "Enter") {
        event.preventDefault();
        calcular();
    } else if (tecla === "Backspace") {
        apagar();
    } else if (tecla === "Escape") {
        limpar();
    }
});

// Carrega o histórico ao abrir a calculadora
atualizarHistorico();
