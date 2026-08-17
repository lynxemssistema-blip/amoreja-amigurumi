const apiKey = "8A737100D665-451D-8E66-6CCF4380C98E";
const instance = "Marcia"; // Based on the screenshot
const baseUrl = "https://evo.lynxems.com.br";
const endpoint = `${baseUrl}/message/sendText/${instance}`;

const data = {
    "number": "5531999522412",
    "text": "🚀 Olá! Esta é a mensagem de TESTE 2 da sua integração de IA. Confirmando o recebimento!"
};

fetch(endpoint, {
    method: 'POST',
    headers: {
        'apikey': apiKey,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
})
.then(res => res.json())
.then(json => console.log("Resposta da Evolution API:", json))
.catch(err => console.error("Erro na Evolution API:", err));
