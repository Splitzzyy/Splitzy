import { Routes, RedirectCommand } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';

export const routes: Routes = [
    { 
        path: '', 
        redirectTo: 'home', 
        pathMatch: 'full' 
    },
    {
        path: 'home',
        loadComponent: () =>
            import('./splitz/home-page/home-page.component')
                .then(m => m.HomePageComponent),
    },
    {
        path: 'login',
        loadComponent: () =>
            import('./splitz/login-page/login-page.component')
                .then(m => m.LoginPageComponent),
    },
    {
        path: 'register',
        loadComponent: () =>
            import('./splitz/register-page/register-page.component')
                .then(m => m.RegisterPageComponent),
    },
    {
        path: 'forgot-password',
        loadComponent: () =>
            import('./splitz/forgot-password/forgot-password.component')
                .then(m => m.ForgotPasswordComponent),
    },
    {
        path: 'setup-password',
        loadComponent: () =>
            import('./splitz/setup-password/setup-password.component')
                .then(m => m.SetupPasswordComponent),
    },
    {
        path: 'verify-email',
        loadComponent: () =>
            import('./splitz/verify-email/verify-email.component')
                .then(m => m.VerifyEmailComponent),
    },
    {
        path: '',
        canActivate: [() => {
            const router = inject(Router);
            const userId = localStorage.getItem('userId');
            if (!userId) {
                return new RedirectCommand(router.parseUrl('/login'));
            }
            return true;
        }],
        loadComponent: () =>
            import('./layout/main-layout/main-layout.component')
                .then(m => m.MainLayoutComponent),
        children: [
            {
                path: 'dashboard',
                loadComponent: () =>
                    import('./splitz/dashboard/dashboard.component')
                        .then(m => m.DashboardComponent),
            },
            {
                path: 'recent-activity',
                loadComponent: () =>
                    import('./splitz/recentactivity/recentactivity.component')
                        .then(m => m.RecentactivityComponent),
            },
            {
                path: 'group/:userId/:groupId',
                loadComponent: () =>
                    import('./splitz/dashboard/groups/groups.component')
                        .then(m => m.GroupsComponent),
            },
            {
                path: 'all-groups',
                loadComponent: () =>
                    import('./splitz/all-groups/all-groups.component')
                        .then(m => m.AllGroupsComponent),
            },
        ],
    },
    { path: '**', redirectTo: '/dashboard' },
];
