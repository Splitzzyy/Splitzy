export const environment = {
    production: false,
    apiBaseUrl: 'https://splitzy.aarshiv.xyz',
    googleClientId: '181191664943-7db5glvs01ifeno7o78kotd9ujv910db.apps.googleusercontent.com',
    bypassAuthOnLocalhost: false,
    endpoints: {
        GOOGLELOGIN: '/api/Auth/google-login',
        SECURE: '/api/Auth/secure',
        LOGIN: '/api/Auth/login',
        LOGOUT: '/api/Auth/logout',
        REGISTER: '/api/Auth/signup',
        DASHBOARD: '/api/Dashboard/dashboard',
        GROUP: '/api/Group/GetGroupOverview',
        CREATE_GROUP: '/api/Group/CreateGroup',
        EXPENSE: '/api/Expense/AddExpense',
        RECENT: '/api/Dashboard/recent',
        FORGOTPASS: '/api/Auth/forget-password',
        SETUPPASS: '/api/Auth/verify',
    }
};
