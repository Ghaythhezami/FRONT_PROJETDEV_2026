import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ThemeToggleTwoComponent } from '../../shared/components/common/theme-toggle-two/theme-toggle-two.component';

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [RouterLink, ThemeToggleTwoComponent],
  templateUrl: './landing-page.component.html',
  styleUrl: './landing-page.component.css',
})
export class LandingPageComponent implements OnInit {
  readonly services = [
    {
      title: 'Sprint boards',
      desc: 'Kanban boards with drag-and-drop, live updates, and assignee avatars.',
      icon: 'board',
    },
    {
      title: 'Backlog & epics',
      desc: 'Organize epics, user stories, and priorities with MoSCoW and story points.',
      icon: 'backlog',
    },
    {
      title: 'AI assistant',
      desc: 'Generate descriptions, standup summaries, and sprint risk insights.',
      icon: 'ai',
    },
    {
      title: 'Real-time alerts',
      desc: 'Instant notifications via SignalR when tasks move or comments arrive.',
      icon: 'notify',
    },
    {
      title: 'Team workload',
      desc: 'Velocity charts, burndown, and dashboards for POs and scrum masters.',
      icon: 'chart',
    },
    {
      title: 'Secure attachments',
      desc: 'Upload files and profile photos with Cloudinary-backed storage.',
      icon: 'cloud',
    },
  ];

  heroVisible = false;

  ngOnInit(): void {
    requestAnimationFrame(() => (this.heroVisible = true));
  }
}
