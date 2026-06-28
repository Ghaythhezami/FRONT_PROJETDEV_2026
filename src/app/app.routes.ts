import { Routes } from '@angular/router';
import { ProfileComponent } from './pages/profile/profile.component';
import { NotFoundComponent } from './pages/other-page/not-found/not-found.component';
import { AppLayoutComponent } from './shared/layout/app-layout/app-layout.component';
import { SignInComponent } from './pages/auth-pages/sign-in/sign-in.component';
import { SignUpComponent } from './pages/auth-pages/sign-up/sign-up.component';
import { authGuard, guestGuard, landingGuard } from './shared/services/auth.guard';
import { adminGuard } from './shared/services/admin.guard';
import { UserListComponent } from './pages/parametrage/user-management/user-list/user-list.component';
import { AgileDashboardComponent } from './pages/agile/dashboard/agile-dashboard.component';
import { ProjectListComponent } from './pages/agile/projects/project-list/project-list.component';
import { ProjectDetailComponent } from './pages/agile/projects/project-detail/project-detail.component';
import { SprintBoardComponent } from './pages/agile/board/sprint-board/sprint-board.component';
import { MyTasksComponent } from './pages/agile/tasks/my-tasks/my-tasks.component';
import { BacklogComponent } from './pages/agile/backlog/backlog/backlog.component';
import { IssueDetailComponent } from './pages/agile/issues/issue-detail/issue-detail.component';
import { NotificationsPageComponent } from './pages/agile/notifications/notifications-page.component';
import { LandingPageComponent } from './pages/landing/landing-page.component';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    component: LandingPageComponent,
    canActivate: [landingGuard],
    title: 'Agile AI — Intelligent sprint delivery',
  },
  {
    path: '',
    component: AppLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        component: AgileDashboardComponent,
        title: 'Dashboard | Agile AI',
      },
      {
        path: 'projects',
        component: ProjectListComponent,
        title: 'Projects | Agile AI',
      },
      {
        path: 'projects/:projectId',
        component: ProjectDetailComponent,
        title: 'Project | Agile AI',
      },
      {
        path: 'projects/:projectId/backlog',
        component: BacklogComponent,
        title: 'Backlog | Agile AI',
      },
      {
        path: 'sprints/:sprintId/board',
        component: SprintBoardComponent,
        title: 'Sprint board | Agile AI',
      },
      {
        path: 'issues/:issueId',
        component: IssueDetailComponent,
        title: 'Issue | Agile AI',
      },
      {
        path: 'my-tasks',
        component: MyTasksComponent,
        title: 'My tasks | Agile AI',
      },
      {
        path: 'notifications',
        component: NotificationsPageComponent,
        title: 'Notifications | Agile AI',
      },
      {
        path: 'profile',
        component: ProfileComponent,
        title: 'Profile | Agile AI',
      },
      {
        path: 'parametrage/users',
        component: UserListComponent,
        canActivate: [adminGuard],
        title: 'User Management | Agile AI',
      },
    ],
  },
  {
    path: 'signin',
    component: SignInComponent,
    canActivate: [guestGuard],
    title: 'Sign in | Agile AI',
  },
  {
    path: 'signup',
    component: SignUpComponent,
    canActivate: [guestGuard],
    title: 'Sign up | Agile AI',
  },
  {
    path: '**',
    component: NotFoundComponent,
    title: 'Not found | Agile AI',
  },
];
