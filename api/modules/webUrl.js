/**
 * Endereço público da plataforma, para os links que vão nos emails.
 *
 * `FRONTEND_URL` é a **lista** de origens aceites pelo CORS, separada por
 * vírgulas. Usá-la inteira num link produzia endereços como
 * `https://log.emg.pt,http://localhost:5173/EMG/Ferias`, que não abrem em lado
 * nenhum — era o que acontecia nos emails de férias. A primeira entrada é a
 * canónica e é essa que se mostra às pessoas.
 */
function webUrl() {
    const first = (process.env.FRONTEND_URL || '').split(',')[0].trim();
    return (first || 'https://log.emg.pt').replace(/\/+$/, '');
}

module.exports = { webUrl };
