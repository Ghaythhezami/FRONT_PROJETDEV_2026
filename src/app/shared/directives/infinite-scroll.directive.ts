import {
  Directive,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  inject,
} from '@angular/core';

@Directive({
  selector: '[appInfiniteScroll]',
  standalone: true,
})
export class InfiniteScrollDirective implements OnInit, OnDestroy {
  private readonly element = inject(ElementRef<HTMLElement>);
  private observer?: IntersectionObserver;

  @Input() appInfiniteScrollDisabled = false;
  @Input() appInfiniteScrollRootMargin = '120px';

  @Output() appInfiniteScroll = new EventEmitter<void>();

  ngOnInit(): void {
    this.observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting && !this.appInfiniteScrollDisabled) {
          this.appInfiniteScroll.emit();
        }
      },
      { root: null, rootMargin: this.appInfiniteScrollRootMargin, threshold: 0.1 },
    );
    this.observer.observe(this.element.nativeElement);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}
