export const environment = {
    production: false,
    //apiBaseUrl: 'https://localhost:7176',
    apiBaseUrl: 'https://splitzy.aarshiv.xyz',
    bypassAuthOnLocalhost: true,
    endpoints: {
        SSOLOGIN: '/api/Auth/ssologin',
        SECURE: '/api/Auth/secure',
        LOGIN: '/api/Auth/login',
        LOGOUT: '/api/Auth/logout',
        REGISTER: '/api/Auth/signup',
        DASHBOARD: '/api/Dashboard/dashboard',
        GROUP: '/api/Group/GetGroupOverview',
        EXPENSE: '/api/Expense/AddExpense',
        RECENT: '/api/Dashboard/recent'
    }
};
