export const environment = {
    production: false,
    apiBaseUrl: 'https://splitzy.aarshiv.xyz',
    googleClientId: '181191664943-7db5glvs01ifeno7o78kotd9ujv910db.apps.googleusercontent.com',
    bypassAuthOnLocalhost: false,
    TOKEN_EXPIRY_TIME: 10 * 60 * 1000, // 10 minutes
    REFRESH_BEFORE_EXPIRY: 30 * 1000, // 30 seconds
    endpoints: {
        // Authentication
        GOOGLELOGIN: '/api/Auth/google-login',
        SECURE: '/api/Auth/secure',
        LOGIN: '/api/Auth/login',
        LOGOUT: '/api/Auth/logout',
        REGISTER: '/api/Auth/signup',
        FORGOTPASS: '/api/Auth/forget-password',
        SETUPPASS: '/api/Auth/verify',
        REFRESH: '/api/Auth/refresh',
        VERIFY_EMAIL: '/api/Auth/verify-email',
        RESEND_VERIFICATION: '/api/Auth/resend-verification',

        // DASHBOARD
        DASHBOARD: '/api/Dashboard/dashboard',
        RECENT: '/api/Dashboard/recent',
        REMIND : '/api/Dashboard/reminder',

        // GROUP
        GROUP: '/api/Group/GetGroupOverview',
        CREATE_GROUP: '/api/Group/CreateGroup',
        ADDUSERTOGROUP: '/api/Group/AddUsersToGroup',
        DELETE_GROUP: '/api/Group/DeleteGroup',

        //EXPENSE
        EXPENSE: '/api/Expense/AddExpense',
        UPDATE_EXPENSE: '/api/Expense/UpdateExpense',
        DELETE_EXPENSE: '/api/Expense/DeleteExpense',
        GET_EXPENSE_DETAILS: '/api/Expense',

        // SETTLEUP
        SETTLEUP: '/api/Settleup/settle-up',
    }
};