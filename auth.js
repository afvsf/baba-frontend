(function(){

  const token = localStorage.getItem('token');

  if(!token){
    window.location.href = 'login.html';
    return;
  }

  try{
    const payload = JSON.parse(atob(token.split('.')[1]));
    const exp = payload.exp * 1000;

    if(Date.now() > exp){
      localStorage.removeItem('token');
      window.location.href = 'login.html';
    }

  }catch{
    window.location.href = 'login.html';
  }

})();
