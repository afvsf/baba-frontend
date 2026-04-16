// senha simples (pode mudar)
const SENHA = "123456";

// verificar acesso
function verificarAcesso(){

  const autorizado = localStorage.getItem("baba_auth");

  if(autorizado !== "ok"){
    pedirSenha();
  }
}

// pedir senha
function pedirSenha(){

  const senha = prompt("🔒 Área restrita\nDigite a senha:");

  if(senha === SENHA){
    localStorage.setItem("baba_auth","ok");
    location.reload();
  }else{
    alert("❌ Acesso negado");
    window.location.href = "index.html";
  }
}

// logout
function logout(){
  localStorage.removeItem("baba_auth");
  alert("Saiu do sistema");
  window.location.href = "index.html";
}
