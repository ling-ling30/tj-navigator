async function probeRest() {
  const res = await fetch('https://tijeapi.transjakarta.co.id/v1/auth/login/guest', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
  });
  const data = await res.json();
  console.log('Login guest response:', JSON.stringify(data, null, 2));
}

probeRest();
