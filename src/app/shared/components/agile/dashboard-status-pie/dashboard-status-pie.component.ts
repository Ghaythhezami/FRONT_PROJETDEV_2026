import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, Inject, Input, PLATFORM_ID, ViewChild } from '@angular/core';
import {
  ApexChart,
  ApexDataLabels,
  ApexLegend,
  ApexNonAxisChartSeries,
  ApexPlotOptions,
  ApexStroke,
  ApexTooltip,
  ChartComponent,
  NgApexchartsModule,
} from 'ng-apexcharts';

export type PieChartOptions = {
  series: ApexNonAxisChartSeries;
  chart: ApexChart;
  labels: string[];
  colors: string[];
  plotOptions: ApexPlotOptions;
  dataLabels: ApexDataLabels;
  legend: ApexLegend;
  stroke: ApexStroke;
  tooltip: ApexTooltip;
};

@Component({
  selector: 'app-dashboard-status-pie',
  standalone: true,
  imports: [CommonModule, NgApexchartsModule],
  template: `
    <div class="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-white/[0.05] dark:bg-gray-900">
      <div class="mb-1 flex items-start justify-between gap-3">
        <div>
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white/90">{{ title }}</h2>
          <p class="text-sm text-gray-500">{{ subtitle }}</p>
        </div>
        <span class="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
          {{ total }} total
        </span>
      </div>
      @if (isBrowser && chartOptions) {
        <apx-chart
          #chart
          [series]="chartOptions.series"
          [chart]="chartOptions.chart"
          [labels]="chartOptions.labels"
          [colors]="chartOptions.colors"
          [plotOptions]="chartOptions.plotOptions"
          [dataLabels]="chartOptions.dataLabels"
          [legend]="chartOptions.legend"
          [stroke]="chartOptions.stroke"
          [tooltip]="chartOptions.tooltip"
        />
      } @else {
        <div class="flex h-64 items-center justify-center text-sm text-gray-400">Loading chart…</div>
      }
    </div>
  `,
})
export class DashboardStatusPieComponent {
  @ViewChild('chart') chart?: ChartComponent;

  @Input() title = 'Work distribution';
  @Input() subtitle = 'Open vs completed workload';
  @Input() set slices(value: { label: string; value: number; color: string }[]) {
    const filtered = value.filter((s) => s.value > 0);
    this.total = filtered.reduce((sum, s) => sum + s.value, 0);
    if (!filtered.length) {
      this.chartOptions = null;
      return;
    }
    this.chartOptions = this.buildOptions(filtered);
  }

  chartOptions: PieChartOptions | null = null;
  total = 0;
  readonly isBrowser: boolean;

  constructor(@Inject(PLATFORM_ID) platformId: object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  private buildOptions(slices: { label: string; value: number; color: string }[]): PieChartOptions {
    return {
      series: slices.map((s) => s.value),
      labels: slices.map((s) => s.label),
      colors: slices.map((s) => s.color),
      chart: {
        type: 'donut',
        height: 280,
        fontFamily: 'inherit',
        animations: { enabled: true, speed: 800, animateGradually: { enabled: true, delay: 120 } },
      },
      plotOptions: {
        pie: {
          donut: {
            size: '72%',
            labels: {
              show: true,
              name: { show: true, fontSize: '13px', offsetY: -4 },
              value: { show: true, fontSize: '22px', fontWeight: 700, offsetY: 4 },
              total: {
                show: true,
                label: 'Tasks',
                fontSize: '12px',
                formatter: () => String(this.total),
              },
            },
          },
          expandOnClick: true,
        },
      },
      dataLabels: { enabled: false },
      legend: {
        position: 'bottom',
        horizontalAlign: 'center',
        fontSize: '12px',
        markers: { shape: 'circle' },
        itemMargin: { horizontal: 8, vertical: 4 },
      },
      stroke: { width: 2, colors: ['#fff'] },
      tooltip: {
        y: { formatter: (val: number) => `${val} tasks` },
      },
    };
  }
}
