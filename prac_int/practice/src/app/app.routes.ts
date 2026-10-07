import { Routes } from '@angular/router';
import { Forms } from './forms/forms';
import { AuthPrac } from './auth-prac/auth-prac';
import { Profile } from './auth-prac/profile/profile';
import { Login } from './auth-prac/login/login';
import { authGuard } from './auth-prac/auth-guard';
import { TypeaheadSearch } from './typeahead-search/typeahead-search';
import { MealScheduler } from './meal-scheduler/meal-scheduler';

export const routes: Routes = [
    {path: '', component: Forms},
    {path: 'forms', component: Forms},
    {path: 'auth-prac', component: AuthPrac,
        children: [
            {path: 'login', component: Login},
            {path: 'profile', component: Profile , canActivate: [authGuard]},
            {path: '', redirectTo: 'login', pathMatch: 'full'},
            {path: '**', redirectTo: 'login', pathMatch: 'full'},
        ]
    },
    {path: 'typeahead-search', component: TypeaheadSearch},
    {path: 'meal-scheduler', component: MealScheduler},
    {path: 'collapse', loadComponent: () => import('./collapse/collapse').then(m => m.Collapse)},
    {path: 'custom-button-demo' , loadComponent : () => import('./custom-button/custom-button-demo/custom-button-demo').then(m=>m.CustomButtonDemo)},
    {path: 'file-explorer' , loadComponent : ()=> import('./file-explorer/file-explorer').then(m=>m.FileExplorer)},
    {path: 'file-explorer-lifted' , loadComponent : ()=> import('./file-explorer-lifted/file-explorer-lifted').then(m=>m.FileExplorerLifted)},
    {path: 'file-explorer-service' , loadComponent : ()=> import('./file-explorer-service/file-explorer-service').then(m=>m.FileExplorerService)},
    {path: 'file-explorer-search' , loadComponent : ()=> import('./file-explorer-search/file-explorer-search').then(m=>m.FileExplorerSearch)},
    {path: "custom" , loadComponent : () => import('./custom/custom').then(m=>m.Custom)}
];
