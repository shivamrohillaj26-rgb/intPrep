import { Pipe, PipeTransform } from '@angular/core';

/** Interview: pure pipe with args — `{{ text | truncate:12:'…' }}` */
@Pipe({
  name: 'truncate',
})
export class TruncatePipe implements PipeTransform {
  transform(value: string | null | undefined, limit = 20, suffix = '…'): string {
    if (value == null) return '';
    if (value.length <= limit) return value;
    return value.slice(0, limit) + suffix;
  }
}
