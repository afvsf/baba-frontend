const API = 'https://baba-backend.onrender.com';

let banco = {
  jogadores: [],
  babas: {},
  mensalidades: {}
};

let dataAtual = '';

async function carregarDados(){
  const jogadores = await fetch(API + '/jogadores').then(r=>r.json());
  const registros = await fetch(API + '/registros').then(r=>r.json());
  const mensalidades = await fetch(API + '/mensalidades').then(r=>r.json());
  const gastos = await fetch(API + '/gastos').then(r=>r.json());

  banco = {
    jogadores,
    babas: {},
    mensalidades: {}
  };

  // montar babas
  registros.forEach(r=>{
    if(!banco.babas[r.data]){
      banco.babas[r.data] = { registros: [], gastos: [] };
    }
    banco.babas[r.data].registros.push(r);
  });

  // montar gastos
  gastos.forEach(g=>{
    if(!banco.babas[g.data]){
      banco.babas[g.data] = { registros: [], gastos: [] };
    }
    banco.babas[g.data].gastos.push(g);
  });

  // montar mensalidades
  mensalidades.forEach(m=>{
    if(!banco.mensalidades[m.mes]){
      banco.mensalidades[m.mes] = { pagos: [] };
    }
    banco.mensalidades[m.mes].pagos.push(m.jogadorId);
  });

  render();
}

// ===== UTIL =====
function val(id){
  return document.getElementById(id)?.value;
}
// Pega nome do jogador pelo ID, ou retorna o ID se não encontrar
function getNome(id){
  return banco.jogadores.find(j=>j.id === id)?.nome || id;
}

// ===== CADASTRO =====
async function cadastrarJogador(){
  const nome = val('novoJogador');
  const tipo = val('tipoJogador');

  if(!nome) return;

  await fetch(API + '/jogadores',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({
      id:'j'+Date.now(),
      nome,
      tipo
    })
  });

  carregarDados();
}


// ===== DATA =====
function trocarData(){
  dataAtual = val('data');

  if(!banco.babas[dataAtual]){
    banco.babas[dataAtual] = { registros: [], gastos: [] };
  }

  salvar();
}

// ===== REGISTRO =====
async function registrar(){
  if(!dataAtual) return alert('Selecione data');

  await fetch(API + '/registro',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({
      data: dataAtual,
      jogadorId: val('jogadorSelect'),
      gols: +val('gols') || 0,
      cartoes: +val('cartoes') || 0,
      obs: val('obs')
    })
  });

  carregarDados();
  limpar();
}


// ===== RENDER =====
function render(){

  // lista jogadores
  const lista = document.getElementById('listaCadastro');
  if(lista){
    lista.innerHTML = '';
    banco.jogadores.forEach(j=>{
      let li = document.createElement('li');
      li.textContent = `${j.nome} (${j.tipo})`;
      lista.appendChild(li);
    });
  }

  // select jogadores
  const select = document.getElementById('jogadorSelect');
  if(select){
    select.innerHTML = '';
    banco.jogadores.forEach(j=>{
      let opt = document.createElement('option');
      opt.value = j.nome;
      opt.textContent = `${j.nome} (${j.tipo})`;
      select.appendChild(opt);
    });
  }

  carregarMensalistas();
  renderMensalidades();
  renderDevedores();
  calcularFinanceiro();
  renderRankingGeral();

}

// ===== MENSALISTAS =====
function carregarMensalistas(){
  const select = document.getElementById('jogadorMensal');
  if(!select) return;

  select.innerHTML = '';

  banco.jogadores
    .filter(j => j.tipo === 'mensal')
    .forEach(j=>{
      let opt = document.createElement('option');
      opt.value = j.nome;
      opt.textContent = j.nome;
      select.appendChild(opt);
    });
}

// ===== MENSALIDADES =====
async function marcarMensalidade(){
  const mes = val('mesRef');
  const jogadorId = val('jogadorMensal');

  await fetch(API + '/mensalidade',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ mes, jogadorId })
  });

  carregarDados();
}

function renderMensalidades(){
  const mes = val('mesRef');
  const ul = document.getElementById('listaMensalidades');
  if(!ul) return;

  ul.innerHTML = '';

  const pagos = banco.mensalidades?.[mes]?.pagos || [];

  pagos.forEach(nome=>{
    let li = document.createElement('li');
    li.textContent = nome + ' ✅';
    ul.appendChild(li);
  });
}

// ===== DEVEDORES =====
function getDevedoresMes(){
  const mes = val('mesRef');
  if(!mes) return [];

  const mensalistas = banco.jogadores
    .filter(j=>j.tipo === 'mensal')
    .map(j=>j.nome);

  const pagos = banco.mensalidades?.[mes]?.pagos || [];

  return mensalistas.filter(n => !pagos.includes(n));
}

function renderDevedores(){
  const ul = document.getElementById('listaDevedores');
  if(!ul) return;

  ul.innerHTML = '';

  getDevedoresMes().forEach(nome=>{
    let li = document.createElement('li');
    li.innerHTML = `${nome} <button onclick="marcarPago('${nome}')">✅ Pago</button>`;
    ul.appendChild(li);
  });
}

function marcarPago(nome){
  const mes = val('mesRef');

  if(!banco.mensalidades[mes]){
    banco.mensalidades[mes] = { pagos: [] };
  }

  banco.mensalidades[mes].pagos.push(nome);
  salvar();
}

// ===== FINANCEIRO =====
function calcularFinanceiro(){
  const baba = banco.babas[dataAtual] || { registros: [], gastos: [] };

  let total = 0;
  baba.registros.forEach(r=>{
    if(r.pagamento === 'sim') total += 10;
  });

  const gastos = (baba.gastos || []).reduce((acc,g)=>acc+g.valor,0);

  setText('total', total);
  setText('gastos', gastos);
  setText('saldo', total - gastos);

  const ul = document.getElementById('listaGastos');
  if(ul){
    ul.innerHTML = '';
    (baba.gastos || []).forEach(g=>{
      let li = document.createElement('li');
      li.textContent = `${g.desc} - R$ ${g.valor}`;
      ul.appendChild(li);
    });
  }
}

// ===== GASTOS =====
async function addGasto(){
  if(!dataAtual) return alert("Selecione data");

  await fetch(API + '/gasto',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({
      data: dataAtual,
      desc: val('gastoDesc'),
      valor: parseFloat(val('gastoValor')) || 0
    })
  });

  carregarDados();
}
// ===== RANKING GERAL =====
function renderRankingGeral(){
  let dados = {};

  Object.values(banco.babas).forEach(b=>{
    (b.registros || []).forEach(r=>{

      const nome = getNome(r.jogadorId || r.nome); // 🔥 SUPORTE COMPLETO

      if(!dados[nome]){
        dados[nome] = {
          gols: 0,
          presenca: 0,
          cartoes: 0,
          pagamentos: 0
        };
      }

      dados[nome].gols += r.gols;
      dados[nome].presenca++;
      dados[nome].cartoes += r.cartoes;

      if(r.pagamento === 'sim'){
        dados[nome].pagamentos++;
      }

    });
  });

  renderRanking('rankingGols',dados,'gols',true);
  renderRanking('rankingPresenca',dados,'presenca',true);
  renderRanking('rankingPagamentos',dados,'pagamentos',true);
  renderRanking('rankingCartoes',dados,'cartoes',false);
}

function renderRanking(id,obj,campo,desc=true){
  const ul = document.getElementById(id);
  if(!ul) return;

  ul.innerHTML='';

  Object.entries(obj)
    .sort((a,b)=> desc ? b[1][campo]-a[1][campo] : a[1][campo]-b[1][campo])
    .forEach(([nome,val])=>{
      let li = document.createElement('li');
      li.textContent=`${nome} - ${val[campo]}`;
      ul.appendChild(li);
    });
}

// ===== PDF =====

function gerarPDFMensal(){
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const mes = document.getElementById('mesRef').value;
  if(!mes) return alert("Selecione o mês");

  const pagos = banco.mensalidades?.[mes]?.pagos || [];
  const devedores = getDevedoresMes();

  const receita = pagos.length * 40;

  let gastos = 0;
  Object.entries(banco.babas).forEach(([data, baba])=>{
    if(data.startsWith(mes)){
      (baba.gastos || []).forEach(g=>{
        gastos += g.valor;
      });
    }
  });

  const saldo = receita - gastos;

  let y = 15;

  // ===== TÍTULO =====
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("PRESTAÇÃO DE CONTAS - BABA", 105, y, { align: "center" });

  y += 10;

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`Mês: ${mes}`, 10, y);

  y += 5;

  // ===== LINHA =====
  doc.line(10, y, 200, y);

  y += 10;

  // ===== RESUMO =====
  doc.setFont("helvetica", "bold");
  doc.text("RESUMO FINANCEIRO", 10, y);

  y += 8;

  doc.setFont("helvetica", "normal");
  doc.text(`Receita: R$ ${receita}`, 10, y);
  y += 6;

  doc.text(`Gastos: R$ ${gastos}`, 10, y);
  y += 6;

  doc.setFont("helvetica", "bold");
  doc.text(`Saldo: R$ ${saldo}`, 10, y);

  y += 10;

  doc.line(10, y, 200, y);

  y += 10;

  // ===== PAGANTES =====
  doc.setFont("helvetica", "bold");
  doc.text("PAGANTES", 10, y);

  y += 8;

  doc.setFont("helvetica", "normal");

  if(pagos.length === 0){
    doc.text("Nenhum pagamento registrado", 10, y);
    y += 6;
  } else {
    pagos.forEach(p=>{
      doc.text(`• ${p}`, 10, y);
      y += 6;
    });
  }

  y += 5;

  doc.line(10, y, 200, y);

  y += 10;

  // ===== DEVEDORES =====
  doc.setFont("helvetica", "bold");
  doc.text("DEVEDORES", 10, y);

  y += 8;

  doc.setFont("helvetica", "normal");

  if(devedores.length === 0){
    doc.text("Nenhum devedor 👍", 10, y);
  } else {
    devedores.forEach(d=>{
      doc.text(`• ${d}`, 10, y);
      y += 6;
    });
  }

  y += 15;

  // ===== RODAPÉ =====
  doc.setFontSize(9);
  doc.setTextColor(100);

  const dataAtual = new Date().toLocaleDateString('pt-BR');

  doc.text(`Gerado em: ${dataAtual}`, 10, 285);

  doc.save(`financeiro-baba-${mes}.pdf`);
}


// ===== WHATSAPP =====
function cobrarWhatsApp(){
  const mes = document.getElementById('mesRef').value;

  if(!mes) return alert("Selecione o mês");

  const devedores = getDevedoresMes();

  if(devedores.length === 0){
    alert("Ninguém devendo 👍");
    return;
  }

  let msg = `⚠️ *BABA - MENSALIDADE ${mes}*\n\n`;

  msg += "Pendentes:\n\n";

  devedores.forEach(nome=>{
    msg += `• ${nome}\n`;
  });

  msg += "\n💰 Favor regularizar.";

  const url = "https://wa.me/?text=" + encodeURIComponent(msg);

  window.open(url, "_blank");
}

// ===== AUX =====
function setText(id,valor){
  const el = document.getElementById(id);
  if(el) el.textContent = valor;
}

function limpar(){
  ['gols','cartoes','obs'].forEach(id=>{
    const el = document.getElementById(id);
    if(el) el.value='';
  });
}

// ===== INIT =====
carregarDados();