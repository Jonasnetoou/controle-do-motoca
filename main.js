// EMPRESAS NA ORDEM SOLICITADA: iFood, Voa, Rappi, 99 Motorista, Uber, Particular
const empresasFixas = [
  { id: 'ifood', nome: 'iFood', icone: '🍔' },
  { id: 'voa', nome: 'Voa', icone: '✈️' },

  { id: 'noveNove', nome: '99 Motorista', icone: '💛' },
  { id: 'uber', nome: 'Uber', icone: '🚗' },
  { id: 'particular', nome: 'Particular', icone: '🤝' }
];

const despesasCategorias = [
  { id: 'gasolina', nome: 'Gasolina', icone: '⛽' },
  { id: 'alimentacao', nome: 'Alimentação', icone: '🍽️' },
  { id: 'outros', nome: 'Outros', icone: '📦' }
];

// Constantes para LocalStorage
const LS_EMPRESAS_EXTRAS = 'empresasExtras';
const LS_EMPRESAS_DIARIAS = 'empresasDiarias';
const LS_META_DIARIA = 'metaDiaria';
const LS_EMPRESAS_REMOVIDAS = 'empresasRemovidasPorDia';

// CORREÇÃO DO FUSO HORÁRIO (GMT-3)
function getDataBrasilia() {
  const agora = new Date();
  const offsetBrasilia = 3 * 60 * 60 * 1000; // 3 horas em milissegundos
  return new Date(agora.getTime() - offsetBrasilia).toISOString().slice(0, 10);
}

// Variáveis globais
let meta = 100;
let dataSelecionada = getDataBrasilia();
let empresasExtras = JSON.parse(localStorage.getItem(`${LS_EMPRESAS_DIARIAS}_${dataSelecionada}`)) || [];
let empresasRemovidas = JSON.parse(localStorage.getItem(`${LS_EMPRESAS_REMOVIDAS}_${dataSelecionada}`)) || [];

// Elementos DOM
const inputData = document.getElementById('input-data');
const btnDiaAnterior = document.getElementById('btn-dia-anterior');
const btnDiaSeguinte = document.getElementById('btn-dia-seguinte');
const btnIniciarDia = document.getElementById('btn-iniciar-dia');
const empresasContainer = document.getElementById('empresas-container');
const despesasLista = document.getElementById('despesas-lista');



const inputMeta = document.getElementById('input-meta');
const btnConfirmarMeta = document.getElementById('btn-confirmar-meta');
const btnAdicionarDespesa = document.getElementById('btn-adicionar-despesa');

// Função para formatar valores monetários
function formatar(valor) {
  return valor.toLocaleString('pt-BR', { 
    style: 'currency', 
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

// Funções de persistência
function carregarDados() {
  const raw = localStorage.getItem(dataSelecionada);
  return raw ? JSON.parse(raw) : {};
}

function salvarDados(dados) {
  localStorage.setItem(dataSelecionada, JSON.stringify(dados));
}

// Função para carregar um dia específico
function carregarDia(data) {
  dataSelecionada = data;
  inputData.value = dataSelecionada;
  empresasRemovidas = JSON.parse(localStorage.getItem(`${LS_EMPRESAS_REMOVIDAS}_${dataSelecionada}`)) || [];
  empresasExtras = JSON.parse(localStorage.getItem(`${LS_EMPRESAS_DIARIAS}_${dataSelecionada}`)) || [];
  meta = parseFloat(localStorage.getItem(`${LS_META_DIARIA}_${dataSelecionada}`)) || 100;
  
  document.getElementById('meta-valor').textContent = meta.toFixed(2);
  atualizarInterface();
  atualizarTotais();
}

// NOVA FUNÇÃO: Calcular totais de ganhos por período
function calcularTotaisGanhos() {
  const totais = {
    ganhosBrutos: { semana: 0, mes: 0 },
    ganhosLiquidos: { semana: 0, mes: 0 },
    despesas: { semana: 0, mes: 0 }
  };

  const hoje = new Date(dataSelecionada);
  const anoAtual = hoje.getFullYear();
  const mesAtual = hoje.getMonth();

  // Calcular início e fim da semana
  const inicioSemana = new Date(hoje);
  inicioSemana.setDate(hoje.getDate() - hoje.getDay());
  const fimSemana = new Date(inicioSemana);
  fimSemana.setDate(inicioSemana.getDate() + 6);

  const keys = Object.keys(localStorage).filter(key => /^\d{4}-\d{2}-\d{2}$/.test(key));

  keys.forEach(dataStr => {
    const data = new Date(dataStr);
    const dadosDia = JSON.parse(localStorage.getItem(dataStr));
    if (!dadosDia) return;

    let ganhoBrutoDia = 0;
    let despesasDia = 0;

    // Calcular ganhos brutos (empresas)
    const todasEmpresasIds = empresasFixas.map(emp => emp.id).concat(
      (JSON.parse(localStorage.getItem(`${LS_EMPRESAS_DIARIAS}_${dataStr}`)) || []).map(emp => emp.id)
    );

    todasEmpresasIds.forEach(empId => {
      const valores = dadosDia[empId] || [];
      valores.forEach(v => {
        if (typeof v === 'string') {
          const partes = v.split(' - ');
          ganhoBrutoDia += parseFloat(partes[1]) || 0;
        } else {
          ganhoBrutoDia += v || 0;
        }
      });
    });

    // Calcular despesas
    despesasCategorias.forEach(cat => {
      const valores = dadosDia[cat.id] || [];
      valores.forEach(v => {
        if (typeof v === 'string') {
          const partes = v.split(' - ');
          despesasDia += parseFloat(partes[1]) || 0;
        } else {
          despesasDia += v || 0;
        }
      });
    });

    // Somar aos totais da semana
    if (data >= inicioSemana && data <= fimSemana) {
      totais.ganhosBrutos.semana += ganhoBrutoDia;
      totais.despesas.semana += despesasDia;
      totais.ganhosLiquidos.semana += (ganhoBrutoDia - despesasDia);
    }

    // Somar aos totais do mês
    if (data.getFullYear() === anoAtual && data.getMonth() === mesAtual) {
      totais.ganhosBrutos.mes += ganhoBrutoDia;
      totais.despesas.mes += despesasDia;
      totais.ganhosLiquidos.mes += (ganhoBrutoDia - despesasDia);
    }
  });

  return totais;
}

// NOVA FUNÇÃO: Atualizar display dos totais de ganhos
function atualizarTotaisGanhos() {
  const totais = calcularTotaisGanhos();

  // Atualizar elementos na tela
  if (document.getElementById('ganho-bruto-semana')) {
    document.getElementById('ganho-bruto-semana').textContent = formatar(totais.ganhosBrutos.semana);
  }
  if (document.getElementById('ganho-liquido-semana')) {
    document.getElementById('ganho-liquido-semana').textContent = formatar(totais.ganhosLiquidos.semana);
  }
  if (document.getElementById('ganho-bruto-mes')) {
    document.getElementById('ganho-bruto-mes').textContent = formatar(totais.ganhosBrutos.mes);
  }
  if (document.getElementById('ganho-liquido-mes')) {
    document.getElementById('ganho-liquido-mes').textContent = formatar(totais.ganhosLiquidos.mes);
  }
}

// Cálculo de totais periódicos (despesas)
function atualizarTotaisPeriodicos() {
  const categorias = ['gasolina', 'alimentacao', 'outros'];
  const totais = {
    gasolina: { dia: 0, semana: 0, mes: 0 },
    alimentacao: { dia: 0, semana: 0, mes: 0 },
    outros: { dia: 0, semana: 0, mes: 0 }
  };

  const hoje = new Date(dataSelecionada);
  const anoAtual = hoje.getFullYear();
  const mesAtual = hoje.getMonth();

  const inicioSemana = new Date(hoje);
  inicioSemana.setDate(hoje.getDate() - hoje.getDay());
  const fimSemana = new Date(inicioSemana);
  fimSemana.setDate(inicioSemana.getDate() + 6);

  const keys = Object.keys(localStorage).filter(key => /^\d{4}-\d{2}-\d{2}$/.test(key));

  keys.forEach(dataStr => {
    const data = new Date(dataStr);
    const dadosDia = JSON.parse(localStorage.getItem(dataStr));
    if (!dadosDia) return;

    categorias.forEach(cat => {
      const lista = dadosDia[cat] || [];
      let soma = 0;
      lista.forEach(v => {
        if (typeof v === 'string') {
          const partes = v.split(' - ');
          soma += parseFloat(partes[1]) || 0;
        } else {
          soma += v;
        }
      });

      if (dataStr === dataSelecionada) totais[cat].dia += soma;
      if (data >= inicioSemana && data <= fimSemana) totais[cat].semana += soma;
      if (data.getFullYear() === anoAtual && data.getMonth() === mesAtual) totais[cat].mes += soma;
    });
  });

  categorias.forEach(cat => {
    if (document.getElementById(`total-${cat}-dia`)) {
      document.getElementById(`total-${cat}-dia`).textContent = formatar(totais[cat].dia);
    }
    if (document.getElementById(`total-${cat}-semana`)) {
      document.getElementById(`total-${cat}-semana`).textContent = formatar(totais[cat].semana);
    }
    if (document.getElementById(`total-${cat}-mes`)) {
      document.getElementById(`total-${cat}-mes`).textContent = formatar(totais[cat].mes);
    }
  });
}

// Atualização de totais (função principal)
function atualizarTotais() {
  const dados = carregarDados();
  let totalBruto = 0;
  let totalDespesas = 0;

  const todasEmpresas = empresasFixas.filter(emp => !empresasRemovidas.includes(emp.id)).concat(empresasExtras);



  todasEmpresas.forEach(emp => {
    const valores = dados[emp.id] || [];
    totalBruto += valores.reduce((soma, val) => {
      if (typeof val === 'string') {
        const partes = val.split(' - ');
        return soma + parseFloat(partes[1] || 0);
      }
      return soma + val;
    }, 0);
  });

  despesasCategorias.forEach(cat => {
    const valores = dados[cat.id] || [];
    valores.forEach(v => {
      let valor;
      if (typeof v === 'string') {
        const parts = v.split(' - ');
        valor = parseFloat(parts[1]) || 0;
      } else {
        valor = v;
      }
      totalDespesas += valor;
    });
  });

  const totalLiquido = totalBruto - totalDespesas;

  document.getElementById('total-bruto').textContent = formatar(totalBruto);
  document.getElementById('total-despesas').textContent = formatar(totalDespesas);
  document.getElementById('total-liquido').textContent = formatar(totalLiquido);
  document.getElementById('meta-valor').textContent = meta.toFixed(2);
  
  const falta = Math.max(meta - totalLiquido, 0);
  document.getElementById('falta').textContent = formatar(falta);

  const mensagemMeta = document.getElementById("mensagem-meta");
  if (mensagemMeta) {
    if (totalLiquido >= meta) {
      mensagemMeta.style.display = "block";
      if (!mensagemMeta.classList.contains("meta-batida-animada")) {
        mensagemMeta.classList.add("meta-batida-animada");
        criarConfetes();
      }
    } else {
      mensagemMeta.style.display = "none";
      mensagemMeta.classList.remove("meta-batida-animada");
    }
  }

  atualizarTotaisPeriodicos();
  document.getElementById("ganhos-hoje-total").textContent = formatar(totalBruto);
  document.getElementById("gastos-hoje-total").textContent = formatar(totalDespesas);
  
  // 🔹 Chamada adicionada para atualizar semana/mês
  atualizarTotaisGanhos();

}

function criarConfetes() {
  const confettiContainer = document.querySelector(".confetti-container");
  if (!confettiContainer) return;

  for (let i = 0; i < 50; i++) {
    const confetti = document.createElement("div");
    confetti.classList.add("confetti");
    confetti.style.left = `${Math.random() * 100}%`;
    confetti.style.animationDelay = `${Math.random() * 2}s`;
    confetti.style.setProperty("--x", `${(Math.random() - 0.5) * 200}px`);
    confetti.style.setProperty("--y", `${Math.random() * 200 + 100}px`);
    confetti.style.setProperty("--deg", `${Math.random() * 360}deg`);
    confettiContainer.appendChild(confetti);

    // Remover confete após a animação
    confetti.addEventListener("animationend", () => {
      confetti.remove();
    });
  }
}

// Atualização da interface
function atualizarInterface() {
  criarLayoutEmpresas();
  criarLayoutDespesas();
  mostrarDados();
}

function criarLayoutEmpresas() {
  empresasContainer.innerHTML = '';
  const todas = empresasFixas.filter(emp => !empresasRemovidas.includes(emp.id)).concat(empresasExtras);
  todas.forEach(({ id, nome, icone }) => {
    const div = document.createElement('div');
    div.id = `empresa-${id}`;
    const isParticular = id === 'particular';
    div.innerHTML = `
      <label><span class="icone">${icone}</span> ${nome}</label>
      <div class="empresa-controls">
        <input type="number" id="input-${id}" placeholder="Valor" min="0" step="0.01" />
        ${isParticular ? '<input type="text" id="descricao-particular" placeholder="Descrição" />' : ''}
        <button onclick="adicionarCorrida('${id}')">Adicionar</button>
        <button class="btn-remover" onclick="removerEmpresaTemporariamente('${id}')">🗑️</button>
      </div>
      <ul id="lista-${id}"></ul>
      <strong>Total ${nome}: <span id="total-${id}">0,00</span></strong>
      ${isParticular ? `
        <div class="particular-controle">
          <input type="number" id="input-recebido-particular" placeholder="Valor recebido" min="0" step="0.01" />
          <button onclick="registrarRecebimentoParticular()">Registrar Recebimento</button>
          <p>Recebido: <strong id="recebido-particular">${formatar(0)}</strong></p>
          <p>Falta receber: <strong id="falta-particular">${formatar(0)}</strong></p>
        </div>
      ` : ''}
    `;
    empresasContainer.appendChild(div);
  });
}

function removerEmpresaTemporariamente(id) {
  if (empresasFixas.some(emp => emp.id === id)) {
    if (!empresasRemovidas.includes(id)) {
      empresasRemovidas.push(id);
    } else {
      empresasRemovidas = empresasRemovidas.filter(empId => empId !== id);
    }
    // Salva no localStorage para esta data específica
    localStorage.setItem(`${LS_EMPRESAS_REMOVIDAS}_${dataSelecionada}`, JSON.stringify(empresasRemovidas));
  } else {
    empresasExtras = empresasExtras.filter(emp => emp.id !== id);
    localStorage.setItem(`${LS_EMPRESAS_DIARIAS}_${dataSelecionada}`, JSON.stringify(empresasExtras));
  }
  atualizarInterface();
  atualizarTotais();
}

function criarLayoutDespesas() {
  despesasLista.innerHTML = '';
  despesasCategorias.forEach(({ id, nome, icone }) => {
    const div = document.createElement('div');
    div.id = `despesa-${id}`;
    div.className = 'despesa-item';
    
    const campoDescricao = id === 'outros' ? 
      `<input type="text" id="descricao-${id}" placeholder="Descrição" />` : '';
    
    div.innerHTML = `
      <label><span class="icone">${icone}</span> ${nome}</label>
      <div class="despesa-controls">
        <input type="number" id="input-${id}" placeholder="Valor" min="0" step="0.01" />
        ${campoDescricao}
        <button onclick="adicionarDespesa('${id}')">Adicionar</button>
        <button class="btn-remover" onclick="removerDespesa('${id}')">🗑️</button>
      </div>
      <ul id="lista-${id}"></ul>
      <strong>Total ${nome}: <span id="total-${id}">${formatar(0)}</span></strong>
    `;
    
    despesasLista.appendChild(div);
  });
}

// Funções para adicionar itens
function removerDespesa(id) {
  const dados = carregarDados();
  if (dados[id]) {
    delete dados[id];
    salvarDados(dados);
    atualizarInterface();
    atualizarTotais();
  }
}

function adicionarCorrida(id) {
  const input = document.getElementById(`input-${id}`);
  const val = parseFloat(input.value.replace(',', '.'));
  if (isNaN(val) || val <= 0) {
    input.focus();
    return;
  }

  const dados = carregarDados();
  if (!dados[id]) dados[id] = [];

  if (id === 'particular') {
    const desc = document.getElementById('descricao-particular').value.trim();
    if (desc) {
      dados[id].push(`${desc} - ${val.toFixed(2)}`);
    } else {
      dados[id].push(val);
    }
    document.getElementById('descricao-particular').value = '';
  } else {
    dados[id].push(val);
  }

  salvarDados(dados);
  input.value = '';
  atualizarInterface();
  atualizarTotais();
}

function adicionarDespesa(id) {
  const input = document.getElementById(`input-${id}`);
  const val = parseFloat(input.value.replace(',', '.'));
  
  if (isNaN(val) || val <= 0) {
    input.focus();
    return;
  }

  const dados = carregarDados();
  if (!dados[id]) dados[id] = [];
  
  if (id === 'outros') {
    const desc = document.getElementById(`descricao-${id}`).value.trim() || 'Outros';
    dados[id].push(`${desc} - ${val.toFixed(2)}`);
    document.getElementById(`descricao-${id}`).value = '';
  } else {
    dados[id].push(val);
  }
  
  salvarDados(dados);
  input.value = '';
  atualizarInterface();
  atualizarTotais();
}

function registrarRecebimentoParticular() {
  const input = document.getElementById('input-recebido-particular');
  const val = parseFloat(input.value.replace(',', '.'));
  if (isNaN(val) || val <= 0) {
    input.focus();
    return;
  }
  const dados = carregarDados();
  if (!dados['recebido-particular']) dados['recebido-particular'] = [];
  dados['recebido-particular'].push(val);
  salvarDados(dados);
  input.value = '';
  atualizarInterface();
  atualizarTotais();
}

// Substitua a função mostrarDados() existente por esta versão modificada
function mostrarDados() {
  const dados = carregarDados();
  const todasEmpresas = empresasFixas.filter(emp => !empresasRemovidas.includes(emp.id)).concat(empresasExtras);

  todasEmpresas.forEach(({ id }) => {
  const lista = document.getElementById(`lista-${id}`);
  const totalEl = document.getElementById(`total-${id}`);
  lista.innerHTML = '';
  let total = 0;
  if (dados[id]) {
    dados[id].forEach((v, i) => {
      let valor = typeof v === 'string' ? parseFloat(v.split(' - ')[1]) : v;
      let desc = typeof v === 'string' ? v.split(' - ')[0] : '';
      total += valor;

      // 🔹 aqui está a mudança
      let texto;
      if (id === "particular") {
        // no particular pode ter traço se tiver descrição
        texto = desc && desc.trim() !== "" 
          ? `${formatar(valor)} - ${desc}` 
          : `${formatar(valor)}`;
      } else {
        // nas outras empresas nunca coloca traço
        texto = `${formatar(valor)}`;
      }

      lista.innerHTML += `<li>${texto} <button class="btn-remover" onclick="removerItem('${id}', ${i})">×</button></li>`;
    });
  }
  totalEl.textContent = formatar(total);
});


  despesasCategorias.forEach(({ id }) => {
    const lista = document.getElementById(`lista-${id}`);
    const totalEl = document.getElementById(`total-${id}`);
    lista.innerHTML = '';
    let total = 0;
    if (dados[id]) {
      dados[id].forEach((v, i) => {
        let valor, desc;
        if (typeof v === 'string') {
          const parts = v.split(' - ');
          desc = parts[0] || (
            id === 'gasolina' ? 'Gasolina' :
            id === 'alimentacao' ? 'Alimentação' :
            'Outros'
          );
          valor = parseFloat(parts[1]) || 0;
        } else {
          valor = v;
          desc = id === 'gasolina' ? 'Gasolina' :
                 id === 'alimentacao' ? 'Alimentação' :
                 'Outros';
        }
        total += valor;
        lista.innerHTML += `<li>${desc} - ${formatar(valor)} <button class="btn-remover" onclick="removerItem('${id}', ${i})">×</button></li>`;
      });
    }
    totalEl.textContent = formatar(total);
  });

  // Particular: valores recebidos
  if (document.getElementById('recebido-particular')) {
    const recebidoLista = dados['recebido-particular'] || [];
    const recebido = recebidoLista.reduce((soma, v) => soma + v, 0);
    document.getElementById('recebido-particular').innerHTML = recebidoLista
      .map((v, i) => `${formatar(v)} <button class="btn-remover" onclick="removerItem('recebido-particular', ${i})">×</button>`)
      .join('<br>');

    let totalParticular = 0;
    if (dados['particular']) {
      dados['particular'].forEach(v => {
        const valor = typeof v === 'string' ? parseFloat(v.split(' - ')[1]) : v;
        totalParticular += valor || 0;
      });
    }

    const falta = Math.max(totalParticular - recebido, 0);
    document.getElementById('falta-particular').textContent = formatar(falta);
  }
}


function removerItem(id, index) {
  const dados = carregarDados();
  if (dados[id]) {
    dados[id].splice(index, 1);
    salvarDados(dados);
    atualizarInterface();
    atualizarTotais();
  }
}

// Navegação entre dias
btnDiaAnterior.onclick = () => {
  const d = new Date(dataSelecionada);
  d.setDate(d.getDate() - 1);
  carregarDia(d.toISOString().slice(0, 10));
};

btnDiaSeguinte.onclick = () => {
  const d = new Date(dataSelecionada);
  d.setDate(d.getDate() + 1);
  const hojeAjustado = new Date(new Date().getTime() - 3*60*60*1000);
  if (d > hojeAjustado) return;
  carregarDia(d.toISOString().slice(0, 10));
};

btnIniciarDia.onclick = () => {
  if (confirm('Tem certeza que deseja resetar o dia atual? Todos os dados serão apagados e as empresas removidas voltarão.')) {
    // Limpa todos os dados do dia atual
    localStorage.removeItem(dataSelecionada);
    
    // Remove o registro de empresas removidas para este dia
    localStorage.removeItem(`${LS_EMPRESAS_REMOVIDAS}_${dataSelecionada}`);
    
    // Limpa as empresas extras adicionadas manualmente
    localStorage.removeItem(`${LS_EMPRESAS_DIARIAS}_${dataSelecionada}`);
    
    // Reseta as variáveis
    empresasRemovidas = [];
    empresasExtras = [];
    
    // Atualiza a interface
    atualizarInterface();
    atualizarTotais();
    
    alert('Dia resetado com sucesso! Todas as empresas foram restauradas.');
  }
};





// Configuração de meta
btnConfirmarMeta.onclick = () => {
  const novaMeta = parseFloat(inputMeta.value.replace(',', '.'));
  if (!isNaN(novaMeta) && novaMeta > 0) {
    meta = novaMeta;
    localStorage.setItem(`${LS_META_DIARIA}_${dataSelecionada}`, meta.toString());
    atualizarTotais();
    inputMeta.value = meta.toFixed(2);
  }
};

// Adicionar despesa
btnAdicionarDespesa.onclick = () => {
  const categoria = document.getElementById('select-categoria-despesa').value;
  adicionarDespesa(categoria);
};

// Exportação para JSON
function exportarParaJSON() {
  const dados = carregarDados();
  const totaisGanhos = calcularTotaisGanhos();
  
  const dadosExportacao = {
    data: dataSelecionada,
    meta: meta,
    corridas: {},
    despesas: {},
    totais: {
      bruto: document.getElementById('total-bruto').textContent,
      despesas: document.getElementById('total-despesas').textContent,
      liquido: document.getElementById('total-liquido').textContent
    },
    totaisPeriodicos: {
      ganhosSemana: {
        bruto: formatar(totaisGanhos.ganhosBrutos.semana),
        liquido: formatar(totaisGanhos.ganhosLiquidos.semana)
      },
      ganhosMes: {
        bruto: formatar(totaisGanhos.ganhosBrutos.mes),
        liquido: formatar(totaisGanhos.ganhosLiquidos.mes)
      }
    }
  };

  const todasEmpresas = empresasFixas.filter(emp => !empresasRemovidas.includes(emp.id)).concat(empresasExtras);
  todasEmpresas.forEach(emp => {
    if (dados[emp.id]) {
      dadosExportacao.corridas[emp.nome] = {
        valores: dados[emp.id],
        total: document.getElementById(`total-${emp.id}`).textContent
      };
    }
  });

  despesasCategorias.forEach(cat => {
    if (dados[cat.id]) {
      dadosExportacao.despesas[cat.nome] = {
        itens: dados[cat.id],
        total: document.getElementById(`total-${cat.id}`).textContent
      };
    }
  });

  const blob = new Blob([JSON.stringify(dadosExportacao, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `relatorio-${dataSelecionada}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// Função para formatação de data
function formatarData(dataStr) {
  const [ano, mes, dia] = dataStr.split('-');
  return `${dia}/${mes}/${ano}`;
}

// CORREÇÃO DA FUNÇÃO filtrarGanhosPorPeriodo
function filtrarGanhosPorPeriodo(categoria, dataInicio, dataFim) {
  const keys = Object.keys(localStorage).filter(key => /^\d{4}-\d{2}-\d{2}$/.test(key));
  const resultados = [];

  keys.forEach(dataStr => {
    if (dataStr < dataInicio || dataStr > dataFim) return;

    const dadosDia = JSON.parse(localStorage.getItem(dataStr));
    if (!dadosDia) return;

    // Buscar empresas extras para esta data específica
    const empresasExtrasDia = JSON.parse(localStorage.getItem(`${LS_EMPRESAS_DIARIAS}_${dataStr}`)) || [];
    const empresasRemovidasDia = JSON.parse(localStorage.getItem(`${LS_EMPRESAS_REMOVIDAS}_${dataStr}`)) || [];
    
    // Combinar empresas fixas (não removidas) com extras
    const todasEmpresasDia = empresasFixas
      .filter(emp => !empresasRemovidasDia.includes(emp.id))
      .concat(empresasExtrasDia);

    if (categoria === 'todos-ganhos') {
      // Mostrar ganhos de todas as empresas
      todasEmpresasDia.forEach(empresa => {
        if (dadosDia[empresa.id]) {
          dadosDia[empresa.id].forEach(v => {
            let valor, desc;
            if (typeof v === 'string') {
              const partes = v.split(' - ');
              desc = partes[0] || empresa.nome;
              valor = parseFloat(partes[1]) || 0;
            } else {
              valor = v || 0;
              desc = empresa.nome;
            }
            if (valor > 0) {
              resultados.push({
                data: formatarData(dataStr),
                descricao: `${empresa.nome}${desc !== empresa.nome ? ' - ' + desc : ''}`,
                valor: valor,
                tipo: 'ganho'
              });
            }
          });
        }
      });
    } else if (categoria === 'ganhos-semana') {
      // Filtrar apenas ganhos da semana atual da data selecionada
      const dataSel = new Date(dataInicio);
      const inicioSemana = new Date(dataSel);
      inicioSemana.setDate(dataSel.getDate() - dataSel.getDay());
      const fimSemana = new Date(inicioSemana);
      fimSemana.setDate(inicioSemana.getDate() + 6);
      
      const dataAtual = new Date(dataStr);
      if (dataAtual >= inicioSemana && dataAtual <= fimSemana) {
        todasEmpresasDia.forEach(empresa => {
          if (dadosDia[empresa.id]) {
            dadosDia[empresa.id].forEach(v => {
              let valor, desc;
              if (typeof v === 'string') {
                const partes = v.split(' - ');
                desc = partes[0] || empresa.nome;
                valor = parseFloat(partes[1]) || 0;
              } else {
                valor = v || 0;
                desc = empresa.nome;
              }
              if (valor > 0) {
                resultados.push({
                  data: formatarData(dataStr),
                  descricao: `${empresa.nome}${desc !== empresa.nome ? ' - ' + desc : ''}`,
                  valor: valor,
                  tipo: 'ganho'
                });
              }
            });
          }
        });
      }
    } else if (categoria === 'ganhos-mes') {
      // Filtrar apenas ganhos do mês atual da data selecionada
      const dataSel = new Date(dataInicio);
      const dataAtual = new Date(dataStr);
      
      if (dataAtual.getMonth() === dataSel.getMonth() && dataAtual.getFullYear() === dataSel.getFullYear()) {
        todasEmpresasDia.forEach(empresa => {
          if (dadosDia[empresa.id]) {
            dadosDia[empresa.id].forEach(v => {
              let valor, desc;
              if (typeof v === 'string') {
                const partes = v.split(' - ');
                desc = partes[0] || empresa.nome;
                valor = parseFloat(partes[1]) || 0;
              } else {
                valor = v || 0;
                desc = empresa.nome;
              }
              if (valor > 0) {
                resultados.push({
                  data: formatarData(dataStr),
                  descricao: `${empresa.nome}${desc !== empresa.nome ? ' - ' + desc : ''}`,
                  valor: valor,
                  tipo: 'ganho'
                });
              }
            });
          }
        });
      }
    }
  });

  // Ordenar por data (mais recente primeiro)
  resultados.sort((a, b) => {
    const dataA = new Date(a.data.split('/').reverse().join('-'));
    const dataB = new Date(b.data.split('/').reverse().join('-'));
    return dataB - dataA;
  });

  return resultados;
}

// Função para exibir resultados do filtro (ATUALIZADA)
function exibirResultadosFiltro(resultados, tipoFiltro = 'despesas') {
  const modal = document.getElementById('modal-filtro');
  const conteudoModal = document.getElementById('resultado-filtro-modal');
  
  if (resultados.length === 0) {
    conteudoModal.innerHTML = `<div class="sem-resultados"><p>⚠️ Nenhum ${tipoFiltro === 'ganhos' ? 'ganho' : 'despesa'} encontrado com os filtros selecionados.</p></div>`;
  } else {
    const categoriaSelect = document.getElementById('filtro-categoria');
    const categoriaNome = categoriaSelect.options[categoriaSelect.selectedIndex].text;
    
    let html = `
      <div class="resumo-filtro">
        <p><strong>Período:</strong> ${document.getElementById('filtro-data-inicio').value} à ${document.getElementById('filtro-data-fim').value}</p>
        <p><strong>Categoria:</strong> ${categoriaNome}</p>
        <p><strong>Total:</strong> ${formatar(resultados.reduce((sum, item) => sum + item.valor, 0))} (${resultados.length} itens)</p>
      </div>
      <table>
        <tr>
          <th>Data</th>
          <th>Descrição</th>
          <th>Valor</th>
        </tr>
    `;
    
    resultados.forEach(item => {
      html += `
        <tr>
          <td>${item.data}</td>
          <td>${item.descricao}</td>
          <td>${formatar(item.valor)}</td>
        </tr>
      `;
    });
    
    html += `</table>`;
    conteudoModal.innerHTML = html;
  }
  modal.style.display = 'block';
}

// CORREÇÃO DO EVENTO DO BOTÃO FILTRAR
document.getElementById('btn-filtrar').onclick = function() {
  const categoria = document.getElementById('filtro-categoria').value;
  const dataInicio = document.getElementById('filtro-data-inicio').value;
  const dataFim = document.getElementById('filtro-data-fim').value;

  if (!dataInicio || !dataFim) {
    alert('Por favor, selecione ambas as datas!');
    return;
  }

  if (dataInicio > dataFim) {
    alert('A data final deve ser maior ou igual à data inicial!');
    return;
  }

  let resultados = [];

  // Verificar se é filtro de ganhos ou despesas
  if (categoria === 'todos-ganhos' || categoria === 'ganhos-semana' || categoria === 'ganhos-mes') {
    resultados = filtrarGanhosPorPeriodo(categoria, dataInicio, dataFim);
    exibirResultadosFiltro(resultados, 'ganhos');
  } else {
    // Filtro de despesas (código original mantido)
    const keys = Object.keys(localStorage).filter(key => /^\d{4}-\d{2}-\d{2}$/.test(key));

    keys.forEach(dataStr => {
      if (dataStr < dataInicio || dataStr > dataFim) return;

      const dadosDia = JSON.parse(localStorage.getItem(dataStr));
      if (!dadosDia) return;

      if (categoria !== 'todas') {
        if (dadosDia[categoria]) {
          dadosDia[categoria].forEach(v => {
            let valor, desc;
            if (typeof v === 'string') {
              const partes = v.split(' - ');
              desc = partes[0];
              valor = parseFloat(partes[1]) || 0;
            } else {
              valor = v || 0;
              desc = categoria === 'gasolina' ? 'Gasolina' : 
                    categoria === 'alimentacao' ? 'Alimentação' : 'Outros';
            }
            if (valor > 0) {
              resultados.push({
                data: formatarData(dataStr),
                descricao: desc,
                valor: valor
              });
            }
          });
        }
      } else {
        // Filtro "todas as despesas"
        despesasCategorias.forEach(cat => {
          if (dadosDia[cat.id]) {
            dadosDia[cat.id].forEach(v => {
              let valor, desc;
              if (typeof v === 'string') {
                const partes = v.split(' - ');
                desc = partes[0];
                valor = parseFloat(partes[1]) || 0;
              } else {
                valor = v || 0;
                desc = cat.nome;
              }
              if (valor > 0) {
                resultados.push({
                  data: formatarData(dataStr),
                  descricao: desc,
                  valor: valor
                });
              }
            });
          }
        });
      }
    });

    // Ordenar despesas por data (mais recente primeiro)
    resultados.sort((a, b) => {
      const dataA = new Date(a.data.split('/').reverse().join('-'));
      const dataB = new Date(b.data.split('/').reverse().join('-'));
      return dataB - dataA;
    });
    
    exibirResultadosFiltro(resultados, 'despesas');
  }
};

// Eventos de modal
document.querySelector('.fechar-modal').onclick = function() {
  document.getElementById('modal-filtro').style.display = 'none';
};

window.onclick = function(event) {
  if (event.target === document.getElementById('modal-filtro')) {
    document.getElementById('modal-filtro').style.display = 'none';
  }
};

// Evento de mudança de data
inputData.addEventListener('change', function() {
  carregarDia(this.value);
});

// Inicialização
document.getElementById('exportar').addEventListener('click', exportarParaJSON);
inputData.value = dataSelecionada;
atualizarInterface();
atualizarTotais();

// Sistema de Anotações
document.addEventListener("DOMContentLoaded", function () {
  const btnSalvar = document.getElementById("btn-salvar-anotacao");
  const novaAnotacao = document.getElementById("nova-anotacao");
  const listaAnotacoes = document.getElementById("lista-anotacoes");
  const modal = document.getElementById("modal-anotacao");
  const modalTexto = document.getElementById("anotacao-texto");
  const btnFecharModal = document.getElementById("btn-fechar-anotacao");
  const btnEditar = document.getElementById("btn-editar-anotacao");
  const btnDeletar = document.getElementById("btn-deletar-anotacao");
  const inputData = document.getElementById("input-data");

  let anotacoes = {};
  let anotacaoSelecionada = null;
  let dataSelecionadaAnotacao = inputData.value;

  function getStorageKey(date) {
    return `anotacoes_${date}`;
  }

  function carregarAnotacoes() {
    dataSelecionadaAnotacao = inputData.value;
    const key = getStorageKey(dataSelecionadaAnotacao);
    anotacoes = JSON.parse(localStorage.getItem(key)) || [];
    renderizarLista();
  }

  function salvarAnotacoes() {
    const key = getStorageKey(dataSelecionadaAnotacao);
    localStorage.setItem(key, JSON.stringify(anotacoes));
    carregarAnotacoes();
  }

  function renderizarLista() {
    if (!listaAnotacoes) return;
    
    listaAnotacoes.innerHTML = "";
    anotacoes.forEach((anotacao, index) => {
      const div = document.createElement("div");
      div.classList.add("anotacao-item");
      div.innerHTML = `
        <div class="anotacao-preview">${anotacao.length > 100 ? anotacao.substring(0, 100) + "..." : anotacao}</div>
        <small>${dataSelecionadaAnotacao}</small>
      `;
      div.onclick = () => abrirModal(index);
      listaAnotacoes.appendChild(div);
    });
  }

  function abrirModal(index) {
    if (!modal || !modalTexto) return;
    
    anotacaoSelecionada = index;
    modalTexto.value = anotacoes[index];
    modal.style.display = "block";
  }

  function fecharModal() {
    if (!modal) return;
    
    modal.style.display = "none";
    anotacaoSelecionada = null;
  }

  // Event listeners condicionais
  if (btnSalvar) {
    btnSalvar.onclick = () => {
      if (!novaAnotacao) return;
      
      const texto = novaAnotacao.value.trim();
      if (!texto) return;
      anotacoes.push(texto);
      salvarAnotacoes();
      novaAnotacao.value = "";
    };
  }

  if (btnEditar) {
    btnEditar.onclick = () => {
      if (anotacaoSelecionada === null || !modalTexto) return;
      anotacoes[anotacaoSelecionada] = modalTexto.value.trim();
      salvarAnotacoes();
      fecharModal();
    };
  }

  if (btnDeletar) {
    btnDeletar.onclick = () => {
      if (anotacaoSelecionada === null) return;
      anotacoes.splice(anotacaoSelecionada, 1);
      salvarAnotacoes();
      fecharModal();
    };
  }

  if (btnFecharModal) {
    btnFecharModal.onclick = fecharModal;
  }

  // Event listener para cliques na janela
  window.addEventListener('click', function (event) {
    if (event.target === modal) {
      fecharModal();
    }
  });

  // Event listener para mudanças na data
  if (inputData) {
    inputData.addEventListener("change", carregarAnotacoes);
  }

  // Carregar anotações iniciais
  carregarAnotacoes();
});

// Função adicional para registro de recebimento particular (mantida do código original)
function registrarRecebimentoParticular() {
  const input = document.getElementById('input-recebido-particular');
  if (!input) return;
  
  const val = parseFloat(input.value.replace(',', '.'));
  if (isNaN(val) || val <= 0) {
    input.focus();
    return;
  }
  
  const dados = carregarDados();
  if (!dados['recebido-particular']) dados['recebido-particular'] = [];
  dados['recebido-particular'].push(val);
  salvarDados(dados);
  input.value = '';
  atualizarInterface();
  atualizarTotais();
}



// Sistema de navegação por abas
document.addEventListener('DOMContentLoaded', function() {
    // Elementos da navegação
    const navItems = document.querySelectorAll('.nav-item');
    const tabContents = document.querySelectorAll('.tab-content');
    
    // Função para trocar de aba
    function switchTab(tabName) {
        // Remove classe active de todas as abas e nav items
        tabContents.forEach(tab => tab.classList.remove('active'));
        navItems.forEach(nav => nav.classList.remove('active'));
        
        // Adiciona classe active na aba e nav item selecionados
        const targetTab = document.getElementById(`tab-${tabName}`);
        const targetNav = document.querySelector(`[data-tab="${tabName}"]`);
        
        if (targetTab) targetTab.classList.add('active');
        if (targetNav) targetNav.classList.add('active');
    }
    
    // Event listeners para os botões de navegação
    navItems.forEach(navItem => {
        navItem.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            switchTab(tabName);
        });
    });
    
    // Inicializar com a primeira aba ativa
    switchTab('corridas');
});

// Ajustar as funções existentes para trabalhar com o novo layout
function criarLayoutEmpresas() {
  const empresasContainer = document.getElementById('empresas-container');
  empresasContainer.innerHTML = '';
  const todas = empresasFixas.filter(emp => !empresasRemovidas.includes(emp.id)).concat(empresasExtras);
  todas.forEach(({ id, nome, icone }) => {
    const div = document.createElement('div');
    div.id = `empresa-${id}`;
    const isParticular = id === 'particular';
    div.innerHTML = `
      <label><span class="icone">${icone}</span> ${nome}</label>
      <div class="empresa-controls">
        <input type="number" id="input-${id}" placeholder="Valor" min="0" step="0.01" />
        ${isParticular ? '<input type="text" id="descricao-particular" placeholder="Descrição" />' : ''}
        <button onclick="adicionarCorrida('${id}')"><i class="fas fa-plus"></i> Adicionar</button>
        <button class="btn-remover" onclick="removerEmpresaTemporariamente('${id}')"><i class="fas fa-trash"></i></button>
      </div>
      <ul id="lista-${id}"></ul>
      <strong>Total ${nome}: <span id="total-${id}">0,00</span></strong>
      ${isParticular ? `
        <div class="particular-controle">
          <input type="number" id="input-recebido-particular" placeholder="Valor recebido" min="0" step="0.01" />
          <button onclick="registrarRecebimentoParticular()"><i class="fas fa-check"></i> Registrar Recebimento</button>
          <p>Recebido: <strong id="recebido-particular">${formatar(0)}</strong></p>
          <p>Falta receber: <strong id="falta-particular">${formatar(0)}</strong></p>
        </div>
      ` : ''}
    `;
    empresasContainer.appendChild(div);
  });
}

function criarLayoutDespesas() {
  const despesasLista = document.getElementById('despesas-lista');
  despesasLista.innerHTML = '';
  despesasCategorias.forEach(({ id, nome, icone }) => {
    const div = document.createElement('div');
    div.id = `despesa-${id}`;
    div.className = 'despesa-item';
    
    const campoDescricao = id === 'outros' ? 
      `<input type="text" id="descricao-${id}" placeholder="Descrição" />` : '';
    
    div.innerHTML = `
      <label><span class="icone">${icone}</span> ${nome}</label>
      <div class="despesa-controls">
        <input type="number" id="input-${id}" placeholder="Valor" min="0" step="0.01" />
        ${campoDescricao}
        <button onclick="adicionarDespesa('${id}')"><i class="fas fa-plus"></i> Adicionar</button>
        <button class="btn-remover" onclick="removerDespesa('${id}')"><i class="fas fa-trash"></i></button>
      </div>
      <ul id="lista-${id}"></ul>
      <strong>Total ${nome}: <span id="total-${id}">${formatar(0)}</span></strong>
    `;
    
    despesasLista.appendChild(div);
  });
}







document.addEventListener('DOMContentLoaded', () => {
    const mensagemMeta = document.getElementById('mensagem-meta');
    const btnFecharMeta = document.getElementById('btn-fechar-meta');

    if (mensagemMeta) {
        // Fecha a mensagem ao clicar no botão 'Fechar'
        if (btnFecharMeta) {
            btnFecharMeta.addEventListener('click', () => {
                mensagemMeta.style.display = 'none';
            });
        }

        // Fecha a mensagem ao clicar fora dela
        window.addEventListener('click', (event) => {
            if (event.target == mensagemMeta) {
                mensagemMeta.style.display = 'none';
            }
        });

        // Fecha a mensagem com a tecla Esc
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && mensagemMeta.style.display === 'block') {
                mensagemMeta.style.display = 'none';
            }
        });
    }
});


