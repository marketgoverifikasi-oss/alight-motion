const axios = require('axios');

class Emailnator {
    constructor() {
        this.baseUrl = 'https://emailnator.com';
        this.headers = {
            'accept': 'application/json',
            'content-type': 'application/json',
            'origin': 'https://emailnator.com',
            'referer': 'https://emailnator.com/',
            'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Mobile Safari/537.36'
        };
    }

    async request(endpoint, method = 'GET', body = null) {
        const res = await axios({
            url: `${this.baseUrl}${endpoint}`,
            method,
            headers: this.headers,
            data: body,
            validateStatus: () => true,
            timeout: 15000
        });
        return res.data;
    }

    async generateGmail(variant = 'standard') {
        const idMap = { alias: 2, standard: 3, googlemail: 8 };
        return this.request('/api/generate-email', 'POST', { ids: [idMap[variant] || 3] });
    }

    async listMessages(email, limit = 20) {
        return this.request('/api/message-list', 'POST', { email, limit });
    }

    async getMessage(messageId) {
        return this.request(`/api/message/${encodeURIComponent(messageId)}`, 'GET');
    }
}

module.exports = new Emailnator();
