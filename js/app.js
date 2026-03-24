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