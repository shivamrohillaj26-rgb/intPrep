import { Directive, ElementRef, HostBinding, Input } from '@angular/core';

@Directive({
  selector: '[appCustomDirective]',
})
export class CustomDirective {
  @Input() set appCustomDirective(value: string) {
    this.elementRef.nativeElement.style.backgroundColor = value;
  }

  // @HostBinding('style.backgroundColor')
  // get backgroundColor() {
  //   return this.appCustomDirective;
  // }
  constructor(private elementRef: ElementRef) {
    // this.elementRef.nativeElement.style.backgroundColor = 'red';
  }
}
